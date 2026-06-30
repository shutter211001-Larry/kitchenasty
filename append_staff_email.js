const fs = require('fs');
const content = `
export const staffPasswordResetEmail = ({ email, resetLink }: { email: string; resetLink: string }) => {
  return {
    subject: 'POS 系統重置密碼通知',
    text: \`您好，\\n\\n您收到這封信是因為我們收到了重置您 POS 帳號密碼的請求。\\n\\n請點擊以下連結重置密碼：\\n\${resetLink}\\n\\n如果這不是您本人的操作，請忽略此信件。\\n\\n謝謝！\`,
    html: \`
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>POS 系統重置密碼通知</h2>
        <p>您好，</p>
        <p>您收到這封信是因為我們收到了重置您 POS 帳號密碼的請求。</p>
        <p>請點擊以下連結重置密碼：</p>
        <a href="\${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #f97316; color: #fff; text-decoration: none; border-radius: 5px;">重置密碼</a>
        <p>如果這不是您本人的操作，請忽略此信件。</p>
        <p>謝謝！</p>
      </div>
    \`
  };
};
`;
fs.appendFileSync('packages/api-server/src/lib/email.ts', content);
console.log('Appended staffPasswordResetEmail');
