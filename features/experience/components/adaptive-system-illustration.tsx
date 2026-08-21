export function AdaptiveSystemIllustration() {
  return <div className="system-illustration adaptive-stack" aria-label="Dimensional Adaptive Intelligence Stack showing portfolio state, deterministic risk, MARA analysis, and policy validation">
    <svg viewBox="0 0 820 720" role="img" aria-labelledby="adaptive-stack-title adaptive-stack-description">
      <title id="adaptive-stack-title">Adaptara Adaptive Intelligence Stack</title>
      <desc id="adaptive-stack-description">A single layered isometric system. Portfolio state enters the deterministic risk layer, passes through MARA INTELLIGENCE analysis, and reaches a Financial Constitution validation boundary. No transaction is shown.</desc>
      <defs>
        <linearGradient id="field" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#171512"/><stop offset="1" stopColor="#080807"/></linearGradient>
        <linearGradient id="base-top" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#39332d"/><stop offset=".52" stopColor="#211e1a"/><stop offset="1" stopColor="#13110f"/></linearGradient>
        <linearGradient id="base-front"><stop stopColor="#171512"/><stop offset="1" stopColor="#090908"/></linearGradient>
        <linearGradient id="risk-plane" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#3a2415"/><stop offset=".48" stopColor="#1f1812"/><stop offset="1" stopColor="#100e0c"/></linearGradient>
        <linearGradient id="mara-plane" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#2c2119"/><stop offset=".5" stopColor="#181410"/><stop offset="1" stopColor="#0c0b09"/></linearGradient>
        <linearGradient id="policy-plane" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#3b3027" stopOpacity=".9"/><stop offset="1" stopColor="#14110e" stopOpacity=".82"/></linearGradient>
        <radialGradient id="orange-glow"><stop stopColor="#ff8b35" stopOpacity=".55"/><stop offset="1" stopColor="#ff6e00" stopOpacity="0"/></radialGradient>
        <filter id="stack-shadow" x="-30%" y="-30%" width="160%" height="190%"><feDropShadow dx="0" dy="28" stdDeviation="24" floodColor="#000" floodOpacity=".62"/></filter>
        <filter id="stack-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="9"/></filter>
        <clipPath id="mara-clip"><path d="m410 195 194 101-194 103-194-103z"/></clipPath>
      </defs>

      <rect className="stack-field" x="10" y="10" width="800" height="700" rx="38" fill="url(#field)"/>
      <g className="stack-grid"><path d="M85 594 410 423l325 171M112 622l298-157 298 157M146 650l264-140 264 140M207 680l203-108 203 108M83 594h654M112 622h596M146 650h528M207 680h406M145 560l262 139M675 560 413 699M210 525l198 174M610 525 412 699M278 488l131 211M542 488 411 699"/></g>
      <ellipse className="stack-ambient" cx="410" cy="505" rx="255" ry="132" fill="url(#orange-glow)" filter="url(#stack-glow)"/>

      <g className="stack-object" filter="url(#stack-shadow)">
        <g className="stack-layer stack-layer--portfolio">
          <path className="layer-side layer-side--left" d="m159 452 251 130v54L159 505z"/>
          <path className="layer-side layer-side--right" d="m661 452-251 130v54l251-131z"/>
          <path className="layer-top" d="m410 321 251 131-251 130-251-130z" fill="url(#base-top)"/>
          <path className="layer-inset" d="m410 349 198 103-198 102-198-102z"/>
          <g className="asset-tiles">
            <g transform="translate(288 429)"><path d="m0 23 47-24 47 24-47 25z"/><circle cx="47" cy="22" r="10"/><text x="47" y="26">$</text><text x="47" y="61">USD₮0</text></g>
            <g transform="translate(384 380)"><path d="m0 23 47-24 47 24-47 25z"/><path d="M38 27h18M41 21h12M44 15h6"/><text x="47" y="61">sTRSY</text></g>
            <g transform="translate(384 476)"><path d="m0 23 47-24 47 24-47 25z"/><path d="m47 12 11 20H36z"/><text x="47" y="61">sXAU</text></g>
            <g transform="translate(480 429)"><path d="m0 23 47-24 47 24-47 25z"/><path d="M39 31c15-14 19-5 15-19M40 18c-9 4-9 17 2 20 9 3 14-3 15-8"/><text x="47" y="61">sAAPLx</text></g>
          </g>
          <text className="layer-label" x="190" y="525">01 · PORTFOLIO / X LAYER</text>
        </g>

        <g className="stack-layer stack-layer--risk">
          <path className="layer-side layer-side--left" d="m205 357 205 107v36L205 393z"/>
          <path className="layer-side layer-side--right" d="m615 357-205 107v36l205-107z"/>
          <path className="layer-top" d="m410 250 205 107-205 107-205-107z" fill="url(#risk-plane)"/>
          <g className="risk-circuit"><path d="m274 357 76-40 70 37 65-34 64 34M286 383l67-35 54 28 100-52M337 403l69-36 73 38"/><circle cx="350" cy="317" r="5"/><circle cx="420" cy="354" r="5"/><circle cx="485" cy="320" r="5"/><circle cx="407" cy="376" r="5"/></g>
          <g className="risk-meter"><path d="M359 378a55 55 0 0 1 102 0"/><path className="risk-meter__active" d="M367 378a47 47 0 0 1 75-26"/><path d="m410 376 31-25"/><circle cx="410" cy="376" r="6"/></g>
          <text className="layer-label" x="234" y="415">02 · DETERMINISTIC RISK</text>
        </g>

        <g className="stack-layer stack-layer--mara">
          <path className="layer-side layer-side--left" d="m216 296 194 103v34L216 330z"/>
          <path className="layer-side layer-side--right" d="m604 296-194 103v34l194-103z"/>
          <path className="layer-top" d="m410 195 194 101-194 103-194-103z" fill="url(#mara-plane)"/>
          <g className="mara-mesh" clipPath="url(#mara-clip)"><path d="M255 291h310M270 316h280M292 341h236M314 366h192M318 242l-7 132M366 217l-4 178M410 195v204M454 218l4 176M502 243l7 130"/></g>
          <g className="mara-signal"><path d="M300 310c42-39 63 28 104-9s62 26 113-11"/><circle cx="300" cy="310" r="5"/><circle cx="404" cy="301" r="7"/><circle cx="517" cy="290" r="5"/></g>
          <g className="mara-core"><path d="m410 241 51 27-51 27-51-27z"/><circle cx="410" cy="268" r="13"/><path d="M404 268h12M410 262v12"/></g>
          <text className="layer-label" x="244" y="347">03 · MARA / ADVISORY</text>
        </g>

        <g className="stack-layer stack-layer--policy">
          <path className="policy-shadow" d="m410 111 176 92-176 92-176-92z"/>
          <path className="policy-frame" d="m410 94 190 99-190 100-190-100zm0 30-132 69 132 70 132-70z" fill="url(#policy-plane)" fillRule="evenodd"/>
          <path className="policy-edge" d="m220 193 190 100 190-100M410 263v30"/>
          <g className="policy-seal"><path d="m410 144 34 18v31c0 24-16 39-34 47-18-8-34-23-34-47v-31z"/><path d="m393 190 11 11 23-28"/></g>
          <g className="policy-corners"><path d="m257 191 20-11M563 191l-20-11M410 126V106"/><circle cx="257" cy="191" r="3"/><circle cx="563" cy="191" r="3"/><circle cx="410" cy="106" r="3"/></g>
          <text className="layer-label layer-label--policy" x="410" y="319" textAnchor="middle">04 · CONSTITUTION VALIDATES SIMULATION</text>
        </g>
      </g>

      <g className="stack-flow"><path d="M410 538V447M410 421v-42M410 354v-36M410 288v-39"/><circle cx="410" cy="538" r="4"/><circle cx="410" cy="447" r="4"/><circle cx="410" cy="379" r="4"/><circle cx="410" cy="318" r="4"/><circle cx="410" cy="249" r="4"/></g>
      <g className="stack-status"><circle cx="687" cy="88" r="5"/><text x="673" y="92" textAnchor="end">VALIDATED · SIMULATION ONLY</text></g>
      <g className="stack-caption"><text x="62" y="667">SUPPLIED ONCHAIN STATE</text><text x="758" y="667" textAnchor="end">OWNER AUTHORITY PRESERVED</text></g>
    </svg>
  </div>;
}
