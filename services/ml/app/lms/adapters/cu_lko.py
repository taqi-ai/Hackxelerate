from ..sandbox import SandboxAdapter


class CULucknow(SandboxAdapter):
    university_id = "cu_lko"
    name = "Chandigarh University, Lucknow (student portal)"
    portal_url = "https://student.culko.in/Login.aspx"
    requires_captcha = True
