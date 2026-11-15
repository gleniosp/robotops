# Security policy

RobotOps is in early development. The repository currently contains development
tooling and a local compatibility fixture. Authentication, tenant isolation, and
the deployed simulation service are planned. There are no supported releases or
security backport commitments; reports are assessed against the current main branch.

## Report a vulnerability

Do not put vulnerability details or exposed secrets in issues, pull requests,
or comments. Use [GitHub private vulnerability reporting](https://github.com/gleniosp/robotops/security/advisories/new)
to send a confidential report to the maintainer. Continue the discussion in the
private report and coordinate disclosure there.

Include the affected revision, expected and observed behavior, likely impact,
and a minimal reproduction using synthetic data. Exclude credentials and private
tenant or network details. Test only resources you are authorized to use.
If credentials are exposed, ask the responsible owner to revoke or rotate them;
removing a file does not invalidate a secret.

Coordinate disclosure with the maintainer. There is no guaranteed response time.
Ordinary bugs belong in [issues](https://github.com/gleniosp/robotops/issues).
Conduct concerns follow [the code of conduct](CODE_OF_CONDUCT.md).
