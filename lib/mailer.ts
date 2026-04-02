import nodemailer from "nodemailer";

export async function enviarEmailRecuperacao(email: string, link: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
    to: email,
    subject: "Recuperação de senha - MVP Automação Fiscal",
    html: `
      <div style="margin:0; padding:0; background:#020617; font-family:Arial, sans-serif;">
        <div style="max-width:620px; margin:0 auto; padding:40px 20px;">
          
          <div style="
            background:linear-gradient(135deg, rgba(2,6,23,0.96) 0%, rgba(15,23,42,0.98) 100%);
            border:1px solid rgba(59,130,246,0.18);
            border-radius:28px;
            overflow:hidden;
            box-shadow:0 24px 70px rgba(0,0,0,0.35);
          ">
            
            <div style="
              padding:32px 32px 20px;
              background:radial-gradient(circle at top, rgba(59,130,246,0.18) 0%, rgba(2,6,23,0) 65%);
            ">
              <div style="
                display:inline-block;
                padding:8px 14px;
                border-radius:999px;
                background:rgba(59,130,246,0.14);
                border:1px solid rgba(59,130,246,0.20);
                color:#bfdbfe;
                font-size:12px;
                font-weight:700;
              ">
                MVP_ Automação Fiscal
              </div>

              <h1 style="
                margin:18px 0 8px;
                font-size:38px;
                line-height:1.1;
                color:#ffffff;
                font-weight:800;
                letter-spacing:-0.02em;
              ">
                Recuperação de senha
              </h1>

              <p style="
                margin:0;
                color:#cbd5e1;
                font-size:15px;
                line-height:1.7;
              ">
                Recebemos uma solicitação para redefinir a senha da sua conta.
                Para continuar com segurança, use o botão abaixo.
              </p>
            </div>

            <div style="padding:0 32px 32px;">
              <div style="
                display:grid;
                grid-template-columns:repeat(2, minmax(0, 1fr));
                gap:12px;
                margin-bottom:22px;
              ">
                <div style="
                  padding:14px 16px;
                  border-radius:18px;
                  background:rgba(15,23,42,0.86);
                  border:1px solid rgba(59,130,246,0.12);
                ">
                  <span style="
                    display:block;
                    font-size:12px;
                    color:#93c5fd;
                    margin-bottom:6px;
                  ">
                    Acesso
                  </span>
                  <strong style="
                    font-size:15px;
                    color:#ffffff;
                  ">
                    Recuperação por email
                  </strong>
                </div>

                <div style="
                  padding:14px 16px;
                  border-radius:18px;
                  background:rgba(15,23,42,0.86);
                  border:1px solid rgba(59,130,246,0.12);
                ">
                  <span style="
                    display:block;
                    font-size:12px;
                    color:#93c5fd;
                    margin-bottom:6px;
                  ">
                    Fluxo
                  </span>
                  <strong style="
                    font-size:15px;
                    color:#ffffff;
                  ">
                    Link temporário
                  </strong>
                </div>
              </div>

              <div style="
                padding:24px;
                border-radius:24px;
                background:linear-gradient(180deg, rgba(2,6,23,0.90) 0%, rgba(15,23,42,0.92) 100%);
                border:1px solid rgba(59,130,246,0.16);
              ">
                <p style="
                  margin:0 0 18px;
                  color:#e2e8f0;
                  font-size:15px;
                  line-height:1.7;
                ">
                  Clique no botão abaixo para definir sua nova senha:
                </p>

                <a
                  href="${link}"
                  style="
                    display:inline-block;
                    width:auto;
                    padding:15px 22px;
                    border-radius:16px;
                    background:linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    color:#ffffff;
                    text-decoration:none;
                    font-weight:800;
                    font-size:15px;
                    box-shadow:0 14px 30px rgba(37,99,235,0.30);
                  "
                >
                  Redefinir senha
                </a>

                <p style="
                  margin:18px 0 0;
                  color:#94a3b8;
                  font-size:13px;
                  line-height:1.7;
                ">
                  Se o botão não funcionar, copie e cole este link no navegador:
                </p>

                <p style="
                  margin:8px 0 0;
                  color:#93c5fd;
                  font-size:13px;
                  word-break:break-all;
                  line-height:1.6;
                ">
                  ${link}
                </p>
              </div>

              <div style="
                margin-top:18px;
                padding:14px 16px;
                border-radius:16px;
                background:rgba(15,23,42,0.92);
                border:1px solid rgba(59,130,246,0.10);
              ">
                <p style="
                  margin:0;
                  color:#94a3b8;
                  font-size:12px;
                  line-height:1.7;
                ">
                  Se você não solicitou esta alteração, ignore este e-mail.
                  O link expira automaticamente por segurança.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
  });
}