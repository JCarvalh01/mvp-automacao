import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function enviarEmailRecuperacao(email: string, link: string) {
  await transporter.sendMail({
    from: `"MVP Automação Fiscal" <${process.env.SMTP_FROM_EMAIL}>`,
    to: email,
    subject: "Recuperação de senha",
    html: `
      <div style="font-family: Arial; padding: 20px;">
        <h2>Recuperação de senha</h2>
        <p>Clique no botão abaixo para redefinir sua senha:</p>

        <a href="${link}" style="
          display:inline-block;
          padding:12px 20px;
          background:#2563eb;
          color:#fff;
          border-radius:8px;
          text-decoration:none;
          margin-top:10px;
        ">
          Redefinir senha
        </a>

        <p style="margin-top:20px; font-size:12px; color:#666;">
          Se você não solicitou, ignore este e-mail.
        </p>
      </div>
    `,
  });
}