package com.getescala.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class BackendHomeController {
  private final String appUrl;

  public BackendHomeController(
      @Value("${getescala.billing.stripe.appUrl:http://localhost:5173}") String appUrl
  ) {
    this.appUrl = appUrl;
  }

  @GetMapping(value = "/", produces = MediaType.TEXT_HTML_VALUE)
  public ResponseEntity<String> home() {
    String html = """
        <!doctype html>
        <html lang="pt-BR">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>GetEscala API</title>
            <style>
              :root { color-scheme: light dark; }
              body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji", "Segoe UI Emoji"; }
              .wrap { max-width: 820px; margin: 0 auto; padding: 40px 20px; }
              .card { border: 1px solid rgba(127,127,127,.25); border-radius: 14px; padding: 20px; }
              .kicker { opacity: .8; font-size: 14px; margin-bottom: 8px; }
              h1 { margin: 0 0 8px; font-size: 22px; }
              p { margin: 0 0 12px; line-height: 1.45; }
              ul { margin: 0 0 16px; padding-left: 18px; }
              li { margin: 6px 0; }
              code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; font-size: 12px; }
              a { color: inherit; }
              .row { display: flex; gap: 12px; flex-wrap: wrap; }
              .pill { display: inline-flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid rgba(127,127,127,.25); border-radius: 999px; font-size: 13px; }
            </style>
          </head>
          <body>
            <div class="wrap">
              <div class="card">
                <div class="kicker">GetEscala API</div>
                <h1>Backend em execução</h1>
                <p>Este endereço é o backend (API). O acesso direto pelo navegador normalmente não é o fluxo correto.</p>
                <ul>
                  <li>Para usar o sistema, acesse o frontend: <a href="%s">%s</a></li>
                  <li>Os endpoints da API ficam em <code>/api</code> (alguns exigem autenticação).</li>
                  <li>Documentação/Swagger: <a href="/swagger-ui/index.html">/swagger-ui/index.html</a></li>
                  <li>Saúde: <a href="/actuator/health">/actuator/health</a></li>
                </ul>
                <div class="row">
                  <div class="pill">base: <code>/api</code></div>
                  <div class="pill">status: <code>OK</code></div>
                </div>
              </div>
            </div>
          </body>
        </html>
        """.formatted(appUrl, appUrl);
    return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(html);
  }
}

