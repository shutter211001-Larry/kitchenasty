import fs from 'fs';
const file = 'packages/admin/src/pages/Login.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('import { useState, FormEvent, useEffect }')) {
  code = code.replace(
    "import { useState, FormEvent } from 'react';",
    "import { useState, FormEvent, useEffect } from 'react';"
  );
}

if (!code.includes('hasSuperAdmin')) {
  const targetState = "const [loading, setLoading] = useState(false);";
  const stateReplacement = \const [loading, setLoading] = useState(false);
  const [hasSuperAdmin, setHasSuperAdmin] = useState(true);

  useEffect(() => {
    fetch('/api/auth/staff/setup-status')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.hasSuperAdmin === 'boolean') {
          setHasSuperAdmin(data.hasSuperAdmin);
        }
      })
      .catch(err => console.error('Failed to fetch setup status:', err));
  }, []);\;
  code = code.replace(targetState, stateReplacement);
}

if (!code.includes('!hasSuperAdmin && (')) {
  const targetButton = \<button
            type="button"
            onClick={() => {\;
  const buttonReplacement = \{!hasSuperAdmin && (
          <button
            type="button"
            onClick={() => {\;
  code = code.replace(targetButton, buttonReplacement);

  const targetButtonEnd = \<span>一鍵帶入預設管理員</span>
          </button>\;
  const buttonEndReplacement = \<span>一鍵帶入預設管理員</span>
          </button>
        )}\;
  code = code.replace(targetButtonEnd, buttonEndReplacement);
}

fs.writeFileSync(file, code);
