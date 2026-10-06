from pathlib import Path
import xml.etree.ElementTree as ET
D=Path(__file__).parent
src=Path.home()/'dev/jojo-friends/private-exports/o18/o18.svg'
ET.register_namespace('', 'http://www.w3.org/2000/svg')
s=ET.fromstring(src.read_text())
s.set('viewBox','130 110 1060 1060'); s.set('width','1024'); s.set('height','1024')
s.set('aria-label','Filo — 值班守护者')
s.attrib.pop('style',None)
ns='{http://www.w3.org/2000/svg}'
def node(xml):return ET.fromstring(xml)
bg=node('''<g xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="ops-bg" cx=".38" cy=".28" r=".85"><stop stop-color="#fbf8ef"/><stop offset="1" stop-color="#efece3"/></radialGradient><linearGradient id="ops-device" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#414b82"/><stop offset="1" stop-color="#252d59"/></linearGradient><linearGradient id="ops-pad" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#718aab"/><stop offset="1" stop-color="#536b8e"/></linearGradient></defs><rect x="130" y="110" width="1060" height="1060" fill="url(#ops-bg)"/></g>''')
s.insert(0,bg)
# Original Filo silhouette, asymmetric eyes, coral dot and face are unchanged.
# A one-ear communications set keeps the distinctive notch clear.
gear=node('''<g xmlns="http://www.w3.org/2000/svg" id="filo-ops-accessories">
  <path d="M974 568 L974 517 Q973 488 996 488 Q1025 488 1025 527 L1025 570" fill="none" stroke="#313962" stroke-width="17" stroke-linecap="round"/>
  <path d="M979 516 Q979 496 996 496" fill="none" stroke="#667393" stroke-width="5" stroke-linecap="round"/>
  <rect x="947" y="555" width="71" height="161" rx="34" fill="#544b3e" opacity=".10" transform="translate(7 8)"/>
  <rect x="947" y="549" width="71" height="160" rx="34" fill="url(#ops-pad)"/>
  <rect x="970" y="557" width="92" height="144" rx="40" fill="url(#ops-device)"/>
  <path d="M993 574 Q1014 566 1033 578" fill="none" stroke="#7780a0" stroke-width="5" stroke-linecap="round" opacity=".55"/>
  <rect x="1010" y="590" width="16" height="26" rx="8" fill="#a0e0cb"/>
  <path d="M1007 697 C1020 766 986 815 914 815 L891 810" fill="none" stroke="#27305d" stroke-width="16" stroke-linecap="round"/>
  <path d="M1009 708 C1015 765 983 803 932 807" fill="none" stroke="#647195" stroke-width="4" stroke-linecap="round"/>
  <rect x="856" y="788" width="68" height="40" rx="20" transform="rotate(9 890 808)" fill="#27305d"/>
  <path d="M870 798 L869 812 M881 799 L880 813" fill="none" stroke="#7b87a9" stroke-width="3.5" stroke-linecap="round"/>
  <!-- One small health/safeguard emblem, not a cloud-vendor logo. -->
  <path d="M816 376 L847 388 V412 C847 434 830 449 816 455 C802 449 785 434 785 412 V388 Z" fill="#425781" opacity=".12" transform="translate(2 4)"/>
  <path d="M816 373 L847 385 V409 C847 431 830 446 816 452 C802 446 785 431 785 409 V385 Z" fill="#e8f1e9"/>
  <path d="M816 382 L839 391 V409 C839 425 827 437 816 443 C805 437 793 425 793 409 V391 Z" fill="#79bcae"/>
  <path d="M798 410 H805 L811 399 L819 423 L825 410 H834" fill="none" stroke="#f8fbf1" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
</g>''')
s.append(gear)
(D/'filo-ops-avatar.private.svg').write_text(ET.tostring(s,encoding='unicode'))
(D/'design-notes.txt').write_text('Filo 值班守护者头像初稿。复用私有 o18 SVG，原轮廓、脸、非对称眼睛、珊瑚红信号点不变。新增单耳通讯耳麦与小型健康守护徽章，保留暖纸背景。仅导出供用户审阅的PNG，不上传SVG母版，不更换生产头像。\n')
