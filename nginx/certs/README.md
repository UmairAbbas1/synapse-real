# SSL Certificates

To generate a self-signed certificate for local testing, run:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/certs/privkey.pem \
  -out nginx/certs/fullchain.pem \
  -subj "/CN=localhost"
```

In production, replace these with real certificates from Let's Encrypt or your provider.
