// Package handler wires HTTP routes to services.
package handler

import (
	"bufio"
	"context"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/andikapradanaarif/vishnu/internal/service"
	"github.com/gofiber/fiber/v3"
)

// ProxyHandler forwards /v1/* requests to the crush server upstream.
// Responses — including the SSE event stream — are streamed through a
// bufio writer with a flush per read so events are delivered as they
// arrive.
type ProxyHandler struct {
	upstream *service.Upstream
}

// NewProxyHandler builds the handler.
func NewProxyHandler(upstream *service.Upstream) *ProxyHandler {
	return &ProxyHandler{upstream: upstream}
}

// Forward proxies a single request to the upstream.
func (h *ProxyHandler) Forward(c fiber.Ctx) error {
	// The upstream request is cancelled when the stream writer exits —
	// which happens when the response finishes or the client disconnects.
	ctx, cancel := context.WithCancel(context.Background())

	header := make(http.Header)
	for key, value := range c.GetReqHeaders() {
		for _, v := range value {
			header.Add(key, v)
		}
	}

	resp, err := h.upstream.Forward(ctx, c.Method(), c.OriginalURL(), header, c.Body())
	if err != nil {
		cancel()
		slog.Warn("Upstream request failed", "method", c.Method(), "url", c.OriginalURL(), "error", err)
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"message": "crush upstream unreachable",
		})
	}

	c.Status(resp.StatusCode)
	for key, values := range resp.Header {
		if hopHeader(key) || strings.EqualFold(key, "Content-Length") || strings.EqualFold(key, "Content-Encoding") {
			continue
		}
		for _, value := range values {
			c.Append(key, value)
		}
	}
	c.Set("X-Accel-Buffering", "no")

	return c.SendStreamWriter(func(w *bufio.Writer) {
		defer func() {
			_ = resp.Body.Close()
			cancel()
		}()
		buf := make([]byte, 32*1024)
		for {
			n, readErr := resp.Body.Read(buf)
			if n > 0 {
				if _, writeErr := w.Write(buf[:n]); writeErr != nil {
					return
				}
				if flushErr := w.Flush(); flushErr != nil {
					return
				}
			}
			if readErr != nil {
				if readErr != io.EOF {
					slog.Debug("Upstream stream ended", "error", readErr)
				}
				return
			}
		}
	})
}

func hopHeader(key string) bool {
	switch http.CanonicalHeaderKey(key) {
	case "Connection", "Keep-Alive", "Proxy-Authenticate", "Proxy-Authorization", "Te", "Trailer", "Transfer-Encoding", "Upgrade":
		return true
	}
	return false
}
