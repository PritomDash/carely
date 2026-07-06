import React from 'react';
import { useParams, Link } from 'react-router-dom';
import AppFooter from '../components/AppFooter';
import CarelyLogo from '../components/CarelyLogo';
import { articles } from '../data/blogArticles';

const PublicNavbar = () => (
  <nav style={{
    background: '#FFFFFF',
    borderBottom: '1px solid #E8EDF3',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    padding: '0 28px',
    height: 60,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  }}>
    <a href="/" style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none' }}>
      <CarelyLogo size={28} />
      <span style={{ fontSize:20, fontWeight:800, color:'#1A1A2E' }}>Carely</span>
    </a>
    <div style={{ display:'flex', gap:12, alignItems:'center' }}>
      <a href="/blog" style={{ color:'#64748B', fontSize:14, fontWeight:500, textDecoration:'none' }}>Blog</a>
      <a href="/login" style={{ padding:'8px 20px', border:'1.5px solid #2B7FFF', borderRadius:8, color:'#2B7FFF', fontWeight:700, fontSize:14, textDecoration:'none' }}>Sign In</a>
      <a href="/register" style={{ padding:'8px 20px', background:'#2B7FFF', borderRadius:8, color:'white', fontWeight:700, fontSize:14, textDecoration:'none' }}>Get Started</a>
    </div>
  </nav>
);

export default function BlogPost() {
  const { slug } = useParams();
  const article = articles.find((a) => a.slug === slug);

  if (!article) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7FAFF' }}>
        <PublicNavbar />
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
          <p className="text-muted">Article not found.</p>
          <Link to="/blog" className="btn btn-primary" style={{ marginTop: 16 }}>Back to Blog</Link>
        </div>
        <AppFooter />
      </div>
    );
  }

  const related = articles
    .filter((a) => a.slug !== article.slug && a.category === article.category)
    .slice(0, 3);

  const relatedFallback = related.length > 0
    ? related
    : articles.filter((a) => a.slug !== article.slug).slice(0, 3);

  return (
    <div style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <PublicNavbar />

      <div style={{ background: article.color, padding: '48px 20px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 14 }}>{article.emoji}</div>
        <span className="badge badge-blue" style={{ marginBottom: 12, display: 'inline-block' }}>{article.category}</span>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1A1A2E', maxWidth: 700, margin: '0 auto 10px', lineHeight: 1.3 }}>
          {article.title}
        </h1>
        <div style={{ color: '#64748B', fontSize: 13 }}>{article.date} &middot; {article.readTime}</div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 64px' }}>
        <div className="card" style={{ padding: '32px 36px' }}>
          {article.content.map((para, i) => (
            <p key={i} style={{ fontSize: 15, color: '#374151', lineHeight: 1.9, marginBottom: 20 }}>{para}</p>
          ))}
        </div>

        <div style={{ marginTop: 20 }}>
          <Link to="/blog" className="text-muted">← Back to Blog</Link>
        </div>

        {relatedFallback.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <h3 style={{ marginBottom: 16, color: '#1A1A2E' }}>Related Articles</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {relatedFallback.map((a) => (
                <Link
                  key={a.id}
                  to={`/blog/${a.slug}`}
                  style={{
                    display: 'block', background: 'white', border: '1px solid #E8EDF3', borderRadius: 14,
                    overflow: 'hidden', textDecoration: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ background: a.color, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                    {a.emoji}
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', lineHeight: 1.4 }}>{a.title}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <AppFooter />
    </div>
  );
}
