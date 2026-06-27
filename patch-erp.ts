import fs from 'fs';
const file = 'packages/shutter-erp-frontend/src/pages/Login.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "              </div>\n            </button>\n          </>\n\n      </div>",
  "              </div>\n            </button>\n          </>\n        )}\n\n      </div>"
);

fs.writeFileSync(file, code);
