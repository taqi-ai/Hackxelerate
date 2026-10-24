from ..sandbox import SandboxAdapter


class LPU(SandboxAdapter):
    university_id = "lpu"
    name = "Lovely Professional University (UMS)"
    portal_url = "https://ums.lpu.in/lpuums/"
    requires_captcha = True
