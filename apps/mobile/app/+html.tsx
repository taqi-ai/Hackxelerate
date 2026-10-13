import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function RootHtml({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1.00001, viewport-fit=cover"
        />
        <title>Ascora Companion - Smart Campus Analytics</title>
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveStyles }} />
        <script dangerouslySetInnerHTML={{ __html: deviceSwitcherScript }} />
      </head>
      <body>
        <div id="simulator-container">
          <header id="simulator-toolbar" aria-label="Device Simulator Controls">
            <div className="sim-title">
              <span className="sim-dot" />
              <span>ASCORA MOBILE SIMULATOR</span>
            </div>
            <div className="sim-devices" role="group" aria-label="Device Switcher">
              <button
                type="button"
                className="sim-btn active"
                data-w="390"
                data-h="844"
                data-name="iPhone 14"
                title="iPhone 14 (390 x 844)"
              >
                iPhone 14 (390×844)
              </button>
              <button
                type="button"
                className="sim-btn"
                data-w="360"
                data-h="800"
                data-name="Android"
                title="Android Compact (360 x 800)"
              >
                Android (360×800)
              </button>
              <button
                type="button"
                className="sim-btn"
                data-w="768"
                data-h="1024"
                data-name="Tablet"
                title="Tablet (768 x 1024)"
              >
                Tablet (768×1024)
              </button>
            </div>
          </header>

          <main id="phone-stage">
            <div id="phone-frame">
              <div id="phone-notch">
                <span className="notch-camera" />
              </div>
              <div id="phone-viewport">{children}</div>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}

const responsiveStyles = `
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  background-color: #040407;
  color: #f4f4f8;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}

#simulator-container {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  box-sizing: border-box;
}

#simulator-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: rgba(14, 14, 21, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  z-index: 100;
}

.sim-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #a9b4f5;
}

.sim-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #6fcf97;
  box-shadow: 0 0 8px #6fcf97;
}

.sim-devices {
  display: flex;
  gap: 8px;
}

.sim-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(244, 244, 248, 0.7);
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sim-btn:hover {
  background: rgba(169, 180, 245, 0.15);
  color: #ffffff;
}

.sim-btn.active {
  background: #a9b4f5;
  color: #07070b;
  border-color: #a9b4f5;
  font-weight: 700;
}

#phone-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow: hidden;
  box-sizing: border-box;
}

#phone-frame {
  position: relative;
  width: 390px;
  height: 844px;
  max-height: calc(100vh - 80px);
  border-radius: 44px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8), 0 0 0 10px #12121c, 0 0 0 12px rgba(255, 255, 255, 0.1);
  overflow: hidden;
  background: #07070b;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease, height 0.3s ease;
}

#phone-notch {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 110px;
  height: 24px;
  background: #12121c;
  border-radius: 999px;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 12px;
  pointer-events: none;
}

.notch-camera {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #040407;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

#phone-viewport {
  flex: 1;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Fallback for narrow real-phone viewports (< 520px) */
@media (max-width: 520px) {
  #simulator-toolbar {
    display: none;
  }
  #phone-stage {
    padding: 0;
  }
  #phone-frame {
    width: 100vw !important;
    height: 100vh !important;
    max-height: 100vh !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }
  #phone-notch {
    display: none;
  }
}
`;

const deviceSwitcherScript = `
document.addEventListener('DOMContentLoaded', () => {
  const btns = document.querySelectorAll('.sim-btn');
  const frame = document.getElementById('phone-frame');
  const notch = document.getElementById('phone-notch');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const w = btn.getAttribute('data-w');
      const h = btn.getAttribute('data-h');
      if (frame) {
        frame.style.width = w + 'px';
        frame.style.height = h + 'px';
      }
      if (notch) {
        if (btn.getAttribute('data-name') === 'Tablet') {
          notch.style.display = 'none';
        } else {
          notch.style.display = 'flex';
        }
      }
    });
  });
});
`;
