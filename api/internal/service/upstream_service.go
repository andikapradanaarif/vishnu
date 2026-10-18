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

// Upstream proxies requests to the `crush server` HTTP API. The
// transport has no overall timeout so SSE streams stay open; dialing
// keeps a short timeout so a dead upstream fails fast.
type Upstream struct {
	base   *url.URL
	client *http.Client
}

// NewUpstream builds an Upstream targeting base (e.g. http://127.0.0.1:9119).
func NewUpstream(base string) (*Upstream, error) {
	u, err := url.Parse(base)
	if err != nil {
		return nil, fmt.Errorf("parse upstream %q: %w", base, err)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return nil, fmt.Errorf("upstream %q: only http/https are supported", base)
	}
	return &Upstream{
		base: u,
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
	}, nil
}

// Base returns the upstream base URL.
func (u *Upstream) Base() string {
	return u.base.String()
}

// Forward dispatches a copy of the incoming request to the upstream and
// returns its response. The caller owns the returned body.
func (u *Upstream) Forward(ctx context.Context, method, requestURI string, header http.Header, body []byte) (*http.Response, error) {
	target := *u.base
	target.Path = strings.TrimSuffix(u.base.Path, "/") + requestURIPath(requestURI)
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
	return u.client.Do(req)
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

// copyHeader copies inbound request headers to the outbound request,
// dropping hop-by-hop headers and Accept-Encoding (the transport re-adds
// gzip itself and transparently decodes the response).
func copyHeader(dst, src http.Header) {
	for key, values := range src {
		if hopByHopHeaders[http.CanonicalHeaderKey(key)] || strings.EqualFold(key, "Accept-Encoding") {
			continue
		}
		for _, value := range values {
			dst.Add(key, value)
		}
	}
}
