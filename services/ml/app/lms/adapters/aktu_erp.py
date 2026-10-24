from ..sandbox import SandboxAdapter


class AKTUERP(SandboxAdapter):
    """No captcha: proves the skip-captcha path of the contract."""
    university_id = "aktu_erp"
    name = "AKTU / state engineering ERP (single sign-on)"
    portal_url = "https://erp.aktu.ac.in"
    requires_captcha = False
