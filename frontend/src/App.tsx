import { useState } from 'react';
import './App.css';

type Signal = 'good' | 'warn' | 'bad';

const providers: Array<{
  provider: string;
  model: string;
  input: string;
  output: string;
  realtime: string;
  success: number;
  latency: string;
  tier: string;
  state: string;
  signal: Signal[];
}> = [
  {
    provider: 'Northstar',
    model: 'grok-4.5',
    input: '$0.0179',
    output: '$0.0536',
    realtime: '0.0604',
    success: 96,
    latency: '2.75s',
    tier: '低价',
    state: '稳定',
    signal: ['warn', 'good', 'good', 'good', 'good', 'good', 'good', 'good'],
  },
  {
    provider: 'Vertex Relay',
    model: 'gemini-2.5-pro',
    input: '$0.0587',
    output: '$0.1760',
    realtime: '0.1981',
    success: 91,
    latency: '3.12s',
    tier: '高速',
    state: '稳定',
    signal: ['good', 'good', 'good', 'good', 'warn', 'good', 'good', 'good'],
  },
  {
    provider: 'Alloy Cloud',
    model: 'claude-sonnet-4',
    input: '$0.0960',
    output: '$0.2880',
    realtime: '0.3241',
    success: 75,
    latency: '4.80s',
    tier: '高质',
    state: '观察',
    signal: ['good', 'good', 'good', 'warn', 'warn', 'good', 'bad', 'warn'],
  },
  {
    provider: 'SwiftGate',
    model: 'deepseek-v3',
    input: '$0.0120',
    output: '$0.0360',
    realtime: '0.0405',
    success: 68,
    latency: '6.24s',
    tier: '低价',
    state: '波动',
    signal: ['good', 'warn', 'good', 'warn', 'bad', 'bad', 'good', 'warn'],
  },
];

function SignalBars({ signal }: { signal: Signal[] }) {
  return (
    <span className="signal-bars" aria-hidden="true">
      {signal.map((value, index) => (
        <span className={`signal signal-${value}`} key={`${value}-${index}`} />
      ))}
    </span>
  );
}

function App() {
  const [isDark, setIsDark] = useState(
    () => window.localStorage.getItem('modelmesh-theme') === 'dark',
  );

  const toggleTheme = () => {
    setIsDark((current) => {
      const next = !current;
      window.localStorage.setItem('modelmesh-theme', next ? 'dark' : 'minimal');
      return next;
    });
  };

  return (
    <main className={`app ${isDark ? 'theme-dark' : 'theme-minimal'}`}>
      <div className="app-shell">
        <header className="topbar">
          <a className="brand" href="#top" aria-label="ModelMesh 首页">
            <span className="brand-mark">M</span>
            <span>ModelMesh</span>
            <span className="brand-edition">OPEN</span>
          </a>

          <nav className="main-nav" aria-label="主导航">
            <a className="nav-active" href="#models">
              Models
            </a>
            <a href="#routing">Routing</a>
            <a href="#usage">Usage</a>
            <a href="#settings">Settings</a>
          </nav>

          <div className="top-actions">
            <span className="live-status">
              <span className="live-dot" />
              All systems normal
            </span>
            <button
              className="theme-toggle"
              type="button"
              aria-pressed={isDark}
              onClick={toggleTheme}
            >
              <span aria-hidden="true">{isDark ? '☀' : '◐'}</span>
              {isDark ? 'Light' : 'Dark'}
            </button>
          </div>
        </header>

        <section className="intro" id="top">
          <div>
            <p className="eyebrow">STYLE LAB / MODEL ROUTING CONSOLE</p>
            <h1>Choose the signal, not the noise.</h1>
            <p className="intro-copy">
              默认采用极简科技风格，黑暗模式切换为专注、克制的开发者工具界面。
            </p>
          </div>

          <div className="theme-preview" aria-label="当前设计主题">
            <div className="theme-swatch swatch-light">
              <span className="swatch-mark">M</span>
              <span>
                <small>DEFAULT</small>
                <strong>Minimal light</strong>
              </span>
              {!isDark && <span className="selected-dot">Selected</span>}
            </div>
            <div className="theme-swatch swatch-dark">
              <span className="swatch-mark">M</span>
              <span>
                <small>DARK MODE</small>
                <strong>Developer dark</strong>
              </span>
              {isDark && <span className="selected-dot">Selected</span>}
            </div>
          </div>
        </section>

        <section className="workspace" id="models">
          <div className="workspace-heading">
            <div>
              <div className="section-label">
                <span className="section-icon">⌁</span>
                Routing overview
              </div>
              <h2>Model providers</h2>
              <p>实时比较价格、可用性和延迟，为每个请求选择最佳渠道。</p>
            </div>
            <div className="heading-actions">
              <button className="button button-quiet" type="button">
                Export
              </button>
              <button className="button button-primary" type="button">
                + Add provider
              </button>
            </div>
          </div>

          <div className="metric-strip">
            <article className="metric">
              <span>Active providers</span>
              <strong>24</strong>
              <small className="metric-positive">+3 this week</small>
            </article>
            <article className="metric">
              <span>Requests today</span>
              <strong>1.84M</strong>
              <small>UTC 00:00 — now</small>
            </article>
            <article className="metric">
              <span>Blended success</span>
              <strong>94.8%</strong>
              <small className="metric-positive">Healthy</small>
            </article>
            <article className="metric">
              <span>Estimated savings</span>
              <strong>$428</strong>
              <small>vs. direct pricing</small>
            </article>
          </div>

          <div className="filters">
            <label className="search">
              <span aria-hidden="true">⌕</span>
              <input aria-label="搜索模型或供应商" placeholder="搜索模型或供应商…" />
              <kbd>/</kbd>
            </label>
            <button className="filter-button" type="button">
              All models <span>⌄</span>
            </button>
            <button className="filter-button" type="button">
              Sort: success rate <span>⌄</span>
            </button>
            <button className="filter-button filter-button-last" type="button">
              24 results
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Provider / model</th>
                  <th>Input / 1M</th>
                  <th>Output / 1M</th>
                  <th>Realtime</th>
                  <th>Success</th>
                  <th>Latency</th>
                  <th>Tags</th>
                  <th className="align-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((provider, index) => (
                  <tr key={provider.provider}>
                    <td>
                      <div className="provider-cell">
                        <span className={`provider-logo provider-logo-${index + 1}`}>
                          {provider.provider.slice(0, 1)}
                        </span>
                        <span>
                          <strong>{provider.model}</strong>
                          <small>{provider.provider}</small>
                        </span>
                      </div>
                    </td>
                    <td className="number-cell">{provider.input}</td>
                    <td className="number-cell">{provider.output}</td>
                    <td>
                      <span className="realtime">{provider.realtime}</span>
                    </td>
                    <td>
                      <div className="success-cell">
                        <SignalBars signal={provider.signal} />
                        <strong>{provider.success}%</strong>
                      </div>
                    </td>
                    <td className="muted-cell">{provider.latency}</td>
                    <td>
                      <div className="tags">
                        <span className={`tag tag-${provider.state}`}>{provider.state}</span>
                        <span className="tag tag-tier">{provider.tier}</span>
                      </div>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="pin-button" type="button">
                          Pin route
                        </button>
                        <button
                          className="more-button"
                          type="button"
                          aria-label={`更多 ${provider.model} 操作`}
                        >
                          ···
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="table-footer">
            <span>Showing 4 of 24 providers</span>
            <div>
              <button type="button" aria-label="上一页">
                ←
              </button>
              <span>Page 1 / 6</span>
              <button type="button" aria-label="下一页">
                →
              </button>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}

export default App;
