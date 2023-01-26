# SWERC Presenter

1. Download a sample PDF presentation

```sh
wget -O sample.pdf "https://github.com/fuljo/flaTLAnd/releases/latest/download/tla_slides.pdf"
```

2. Start a file server

```sh
caddy file-server --listen 0.0.0.0:3000
```
or 
```sh
 python -m http.server --bind 0.0.0.0 3000 
```

3. Preview the site [http://localhost:3000/viewer.html](http://localhost:3000/viewer.html)