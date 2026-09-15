# Security policy

## Reporting a vulnerability

Please do not report security vulnerabilities in a public GitHub issue. Contact the maintainer privately with:

- a description of the vulnerability;
- the affected route, component, or migration;
- reproducible steps or a proof of concept;
- the potential impact.

Allow reasonable time for investigation and remediation before public disclosure.

## Secrets

Never commit `.env`, Neon database passwords, Better Auth secrets, or access tokens. If a credential is exposed, rotate it immediately in Neon or Vercel, then remove it from Git history before making the repository public.
