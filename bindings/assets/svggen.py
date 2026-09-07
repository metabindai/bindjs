MONO="ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace"
SANS="-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, Roboto, sans-serif"
ACC="#a8461d"; INK="#12171c"; GRAY="#5c6771"; RULE="#e4e9ec"; LINE="#d5dce0"; PILLBG="#f5f7f8"; W=960
def esc(s): return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace('"',"&quot;")
class D:
    def __init__(s,title,subtitle,lanes,aria):
        s.title=title; s.subtitle=subtitle; s.lanes=lanes; s.aria=aria; s.y=150; s.parts=[]
        n=len(lanes); s.x=[int(W*(i+1)/(n+1)) for i in range(n)]
    def section(s,label):
        s.y+=4
        s.parts.append(f'<text x="26" y="{s.y+4}" font-family="{MONO}" font-size="9.5" letter-spacing="1.5" fill="{GRAY}">{esc(label)}</text>')
        s.parts.append(f'<line x1="{26+len(label)*7.0+16:.1f}" y1="{s.y}" x2="934" y2="{s.y}" stroke="{RULE}" stroke-width="1"/>')
        s.y+=44
    def arrow(s,frm,to,label,sub=None,resp=False):
        x1,x2=s.x[frm],s.x[to]; y=s.y; d=8 if x2>x1 else -8
        dash=' stroke-dasharray="5 4"' if resp else ''
        s.parts.append(f'<line x1="{x1}" y1="{y}" x2="{x2-d}" y2="{y}" stroke="{ACC}" stroke-width="1.25"{dash}/>')
        s.parts.append(f'<path d="M {x2} {y} L {x2-d} {y-4.2} L {x2-d} {y+4.2} Z" fill="{ACC}"/>')
        mx=(x1+x2)/2
        s.parts.append(f'<text x="{mx}" y="{y-9}" text-anchor="middle" font-family="{MONO}" font-size="11.5" fill="{INK}">{esc(label)}</text>')
        if sub: s.parts.append(f'<text x="{mx}" y="{y+15}" text-anchor="middle" font-family="{SANS}" font-size="10.5" fill="{GRAY}">{esc(sub)}</text>')
        s.y+=44 if sub else 34
    def note(s,lane,label,sub=None):
        x=s.x[lane]; y=s.y
        s.parts.append(f'<text x="{x}" y="{y-9}" text-anchor="middle" font-family="{MONO}" font-size="11.5" fill="{INK}">{esc(label)}</text>')
        if sub: s.parts.append(f'<text x="{x}" y="{y+15}" text-anchor="middle" font-family="{SANS}" font-size="10.5" fill="{GRAY}">{esc(sub)}</text>')
        s.y+=44 if sub else 34
    def pill(s,lane,label):
        w=len(label)*7.3+34; x=s.x[lane]-w/2; y=s.y-14
        s.parts.append(f'<rect x="{x:.1f}" y="{y}" width="{w:.1f}" height="30" rx="15" fill="{ACC}"/>')
        s.parts.append(f'<text x="{s.x[lane]}" y="{y+19.5}" text-anchor="middle" font-family="{MONO}" font-size="11.5" font-weight="600" letter-spacing="0.2" fill="#ffffff">{esc(label)}</text>')
        s.y+=54
    def render(s):
        H=s.y+40
        out=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="{esc(s.aria)}">',
             f'<rect x="0.5" y="0.5" width="{W-1}" height="{H-1}" rx="10" fill="#ffffff" stroke="{LINE}"/>']
        for x in s.x: out.append(f'<line x1="{x}" y1="140" x2="{x}" y2="{H-46}" stroke="{LINE}" stroke-width="1"/>')
        out.append(f'<text x="28" y="42" font-family="{MONO}" font-size="14" font-weight="600" letter-spacing="-0.2" fill="{ACC}">{esc(s.title)}</text>')
        out.append(f'<text x="28" y="61" font-family="{SANS}" font-size="11.5" fill="{GRAY}">{esc(s.subtitle)}</text>')
        for x,(name,desc) in zip(s.x,s.lanes):
            w=max(84,len(name)*8.4+20)
            out.append(f'<rect x="{x-w/2:.1f}" y="84" width="{w:.1f}" height="26" rx="13" fill="{PILLBG}" stroke="{LINE}"/>')
            out.append(f'<text x="{x}" y="101" text-anchor="middle" font-family="{MONO}" font-size="10.5" letter-spacing="0.9" fill="{INK}">{esc(name)}</text>')
            out.append(f'<text x="{x}" y="125" text-anchor="middle" font-family="{SANS}" font-size="10" fill="{GRAY}">{esc(desc)}</text>')
        out+=s.parts; ly=H-24
        out.append(f'<line x1="28" y1="{ly}" x2="54" y2="{ly}" stroke="{GRAY}"/><text x="62" y="{ly+4}" font-family="{MONO}" font-size="10" letter-spacing="0.6" fill="{GRAY}">REQUEST</text>')
        out.append(f'<line x1="140" y1="{ly}" x2="166" y2="{ly}" stroke="{GRAY}" stroke-dasharray="5 4"/><text x="174" y="{ly+4}" font-family="{MONO}" font-size="10" letter-spacing="0.6" fill="{GRAY}">RESPONSE</text>')
        out.append('</svg>'); return "\n".join(out)
