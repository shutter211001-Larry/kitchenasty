const fs = require('fs');
const content = `
export const erpInviteEmail = ({ email, inviteLink }: { email: string; inviteLink: string }) => {
  return {
    subject: '邀請您加入 ERP 系統',
    text: \`您好，\\n\\n管理員邀請您加入 ERP 系統。\\n\\n請點擊以下連結開通您的帳號並設定密碼：\\n\${inviteLink}\\n\\n如果這不是您本人的操作，請忽略此信件。\\n\\n謝謝！\`,
    html: \`
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>邀請您加入 ERP 系統</h2>
        <p>您好，</p>
        <p>管理員邀請您加入 ERP 系統。</p>
        <p>請點擊以下連結開通您的帳號並設定密碼：</p>
        <a href="\${inviteLink}" style="display: inline-block; padding: 10px 20px; background-color: #f97316; color: #fff; text-decoration: none; border-radius: 5px;">接受邀請並開通帳號</a>
        <p>如果這不是您本人的操作，請忽略此信件。</p>
        <p>謝謝！</p>
      </div>
    \`
  };
};
`;
fs.appendFileSync('packages/api-server/src/lib/email.ts', content);
console.log('Appended erpInviteEmail');
