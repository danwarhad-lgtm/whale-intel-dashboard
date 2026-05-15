// Vercel Go serverless function: parallel API health checker.
// Endpoint: GET /api/health
// Pings CoinGecko, DefiLlama, and Binance free public APIs concurrently.

package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"
	"time"
)

type Check struct {
	Provider  string `json:"provider"`
	Status    string `json:"status"` // "ok" | "degraded" | "down"
	LatencyMs int64  `json:"latencyMs"`
	Message   string `json:"message,omitempty"`
	CheckedAt string `json:"checkedAt"`
}

type target struct {
	name string
	url  string
}

func ping(ctx context.Context, t target) Check {
	start := time.Now()
	checkedAt := start.UTC().Format(time.RFC3339)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, t.url, nil)
	if err != nil {
		return Check{Provider: t.name, Status: "down", LatencyMs: 0, Message: err.Error(), CheckedAt: checkedAt}
	}

	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Do(req)
	latency := time.Since(start).Milliseconds()
	if err != nil {
		return Check{Provider: t.name, Status: "down", LatencyMs: latency, Message: err.Error(), CheckedAt: checkedAt}
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		status := "ok"
		if latency > 1500 {
			status = "degraded"
		}
		return Check{Provider: t.name, Status: status, LatencyMs: latency, CheckedAt: checkedAt}
	}

	return Check{
		Provider:  t.name,
		Status:    "down",
		LatencyMs: latency,
		Message:   resp.Status,
		CheckedAt: checkedAt,
	}
}

// Handler is Vercel's exported entrypoint.
func Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	targets := []target{
		{"coingecko", "https://api.coingecko.com/api/v3/ping"},
		{"defillama", "https://api.llama.fi/protocols"},
		{"binance", "https://api.binance.com/api/v3/ping"},
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	out := make([]Check, len(targets))
	var wg sync.WaitGroup
	for i, t := range targets {
		wg.Add(1)
		go func(i int, t target) {
			defer wg.Done()
			out[i] = ping(ctx, t)
		}(i, t)
	}
	wg.Wait()

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"engine":    "go-1.22-net-http",
		"checkedAt": time.Now().UTC().Format(time.RFC3339),
		"checks":    out,
	})
}
