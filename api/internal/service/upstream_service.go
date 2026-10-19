// Package service holds third-party and infrastructure integrations.
package service

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Proxy forwards requests to a `crush server` whose address is resolved
// per request from the project registry. The transport has no overall
// timeout so SSE streams stay open; dialing keeps a short timeout so a
// dead upstream fails fast.
type Proxy struct {
	client *http.Client
}

func NewProxy() *Proxy {
	return &Proxy{
		client: &http.Client{
			Transport: &http.Transport{
				Proxy:               http.ProxyFromEnvironment,
				MaxIdleConnsPerHost: 16,
				IdleConnTimeout:     90 * time.Second,
				DialContext: (&net.Dialer{
					Timeout: 5 * time.Second,
				}).DialContext,
			},
		},
	}
}

// Forward dispatches a copy of the incoming request to base (e.g.
// http://127.0.0.1:9201) and returns its response. The caller owns the
// returned body.
func (p *Proxy) Forward(ctx context.Context, base, method, requestURI string, header http.Header, body []byte) (*http.Response, error) {
	target, err := url.Parse(base)
	if err != nil {
		return nil, fmt.Errorf("parse upstream %q: %w", base, err)
	}
	if target.Scheme != "http" && target.Scheme != "https" {
		return nil, fmt.Errorf("upstream %q: only http/https are supported", base)
	}

	target.Path = strings.TrimSuffix(target.Path, "/") + requestURIPath(requestURI)
	target.RawPath = ""
	target.RawQuery = requestURIQuery(requestURI)

	var reader io.Reader
	if len(body) > 0 {
		reader = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, method, target.String(), reader)
	if err != nil {
		return nil, fmt.Errorf("build upstream request: %w", err)
	}
	copyHeader(req.Header, header)
	return p.client.Do(req)
}

// requestURIPath splits the path portion off a RequestURI.
func requestURIPath(requestURI string) string {
	if i := strings.IndexByte(requestURI, '?'); i >= 0 {
		return requestURI[:i]
	}
	return requestURI
}

// requestURIQuery splits the query portion off a RequestURI.
func requestURIQuery(requestURI string) string {
	if i := strings.IndexByte(requestURI, '?'); i >= 0 {
		return requestURI[i+1:]
	}
	return ""
}

// hopByHopHeaders are stripped on both directions of the proxy.
var hopByHopHeaders = map[string]bool{
	"Connection":          true,
	"Keep-Alive":          true,
	"Proxy-Authenticate":  true,
	"Proxy-Authorization": true,
	"TE":                  true,
	"Trailer":             true,
	"Transfer-Encoding":   true,
	"Upgrade":             true,
	"Host":                true,
}

// requestCredentials never cross the proxy. The session cookie and any
// Authorization belong to the browser and the vishnu API; crush reads neither,
// and an external upstream is a server the user registered — forwarding the
// session token there would hand it to whoever runs that server.
var requestCredentials = map[string]bool{
	"Cookie":        true,
	"Authorization": true,
}

// copyHeader copies inbound request headers to the outbound request, dropping
// hop-by-hop headers, the caller's credentials and Accept-Encoding (the
// transport re-adds gzip itself and transparently decodes the response).
func copyHeader(dst, src http.Header) {
	for key, values := range src {
		switch {
		case hopByHopHeaders[http.CanonicalHeaderKey(key)]:
			continue
		case requestCredentials[http.CanonicalHeaderKey(key)]:
			continue
		case strings.EqualFold(key, "Accept-Encoding"):
			continue
		}
		for _, value := range values {
			dst.Add(key, value)
		}
	}
}
