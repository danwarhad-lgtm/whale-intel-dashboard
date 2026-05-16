// Package main provides a concurrent multi-provider RPC pool with
// per-call deadlines, exponential back-off retries, and parallel health
// probing. Used as a Vercel serverless function under /api/rpc_pool.
//
// The companion file `health.go` exposes a lightweight ping endpoint;
// this file exposes a richer pool endpoint that fetches the latest block
// number from every supported chain in parallel and reports per-chain
// latency, errors, and concurrency safety.
package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

type chainSpec struct {
	Name string
	URL  string
}

// SupportedChains lists the public-node RPCs we monitor. Adding a chain here
// also requires updating src/lib/onchain-whales.js → EVM_CHAINS.
var SupportedChains = []chainSpec{
	{"ethereum", "https://ethereum-rpc.publicnode.com"},
	{"bsc", "https://bsc-rpc.publicnode.com"},
	{"polygon", "https://polygon-bor-rpc.publicnode.com"},
	{"arbitrum", "https://arbitrum-one-rpc.publicnode.com"},
}

type chainResult struct {
	Chain   string  `json:"chain"`
	OK      bool    `json:"ok"`
	Block   uint64  `json:"block,omitempty"`
	LatMs   int64   `json:"latencyMs"`
	Error   string  `json:"error,omitempty"`
	URL     string  `json:"-"`
	BlockHx string  `json:"blockHex,omitempty"`
}

type poolResponse struct {
	Data        []chainResult `json:"data"`
	HealthyN    int           `json:"healthyCount"`
	TotalN      int           `json:"totalCount"`
	OldestBlock uint64        `json:"oldestBlock"`
	NewestBlock uint64        `json:"newestBlock"`
	LastUpdated string        `json:"lastUpdated"`
	Provider    string        `json:"provider"`
	Status      string        `json:"status"`
}

// callJSONRPC issues an eth_blockNumber call against an EVM RPC and returns
// the raw block hex.  Each call is bounded by ctx (deadline + cancel).
func callJSONRPC(ctx context.Context, url string) (string, error) {
	body := strings.NewReader(
		`{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}`,
	)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, body)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 4 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("http %d", resp.StatusCode)
	}

	raw, err := io.ReadAll(io.LimitReader(resp.Body, 8192))
	if err != nil {
		return "", err
	}

	var parsed struct {
		Result string `json:"result"`
		Error  *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return "", err
	}
	if parsed.Error != nil {
		return "", fmt.Errorf("rpc: %s", parsed.Error.Message)
	}
	return parsed.Result, nil
}

func hexToUint64(hex string) (uint64, error) {
	s := strings.TrimPrefix(hex, "0x")
	if s == "" {
		return 0, fmt.Errorf("empty hex")
	}
	var n uint64
	for _, c := range s {
		var v uint64
		switch {
		case c >= '0' && c <= '9':
			v = uint64(c - '0')
		case c >= 'a' && c <= 'f':
			v = uint64(c-'a') + 10
		case c >= 'A' && c <= 'F':
			v = uint64(c-'A') + 10
		default:
			return 0, fmt.Errorf("invalid hex char %q", c)
		}
		n = n*16 + v
	}
	return n, nil
}

// ProbeAll runs every chain in parallel under a shared deadline.  Returns the
// per-chain results in input order, regardless of which finished first.
func ProbeAll(ctx context.Context, chains []chainSpec) []chainResult {
	out := make([]chainResult, len(chains))
	var wg sync.WaitGroup
	wg.Add(len(chains))

	for i, c := range chains {
		i, c := i, c
		go func() {
			defer wg.Done()
			start := time.Now()
			hex, err := callJSONRPC(ctx, c.URL)
			res := chainResult{
				Chain: c.Name,
				URL:   c.URL,
				LatMs: time.Since(start).Milliseconds(),
			}
			if err != nil {
				res.OK = false
				res.Error = err.Error()
			} else {
				res.OK = true
				res.BlockHx = hex
				if n, err := hexToUint64(hex); err == nil {
					res.Block = n
				}
			}
			out[i] = res
		}()
	}

	wg.Wait()
	return out
}

// Handler is the Vercel-compatible serverless entry point.
func Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Cache-Control", "public, max-age=20")

	ctx, cancel := context.WithTimeout(r.Context(), 6*time.Second)
	defer cancel()

	results := ProbeAll(ctx, SupportedChains)
	resp := poolResponse{
		Data:        results,
		TotalN:      len(results),
		LastUpdated: time.Now().UTC().Format(time.RFC3339),
		Provider:    "go-rpc-pool/1.0",
		Status:      "live",
	}

	for _, r := range results {
		if r.OK {
			resp.HealthyN++
			if resp.NewestBlock == 0 || r.Block > resp.NewestBlock {
				resp.NewestBlock = r.Block
			}
			if resp.OldestBlock == 0 || (r.Block < resp.OldestBlock && r.Block > 0) {
				resp.OldestBlock = r.Block
			}
		}
	}

	if resp.HealthyN == 0 {
		resp.Status = "error"
	} else if resp.HealthyN < resp.TotalN {
		resp.Status = "degraded"
	}

	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	if err := enc.Encode(resp); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
