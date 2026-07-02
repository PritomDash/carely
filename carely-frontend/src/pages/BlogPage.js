import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AppNavbar from '../components/AppNavbar';
import AppFooter from '../components/AppFooter';
import { articles } from '../data/blogArticles';

const CATEGORIES = ['All', 'Child Care', 'Aged Care', 'Nurse', 'Physiotherapist', 'About Carely'];

export default function BlogPage() {
  const [category, setCategory] = useState('All');

  const filtered = category === 'All' ? articles : articles.filter((a) => a.category === category);

  return (
    <div style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />

      <div style={{ background: 'linear-gradient(135deg,#2B7FFF,#60A5FA)', padding: '56px 20px', textAlign: 'center' }}>
        <h1 style={{ color: 'white', fontSize: 34, fontWeight: 800, marginBottom: 10 }}>Carely Blog</h1>
        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16, margin: 0 }}>Tips and guides for care in Bangladesh</p>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 64px' }}>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 32, justifyContent: 'center' }}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{
                padding: '8px 18px', borderRadius: 999, border: c === category ? 'none' : '1px solid #E2E8F0',
                background: c === category ? '#2B7FFF' : 'white', color: c === category ? 'white' : '#374151',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}
            >
              {c}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {filtered.map((a) => (
            <Link
              key={a.id}
              to={`/blog/${a.slug}`}
              style={{
                display: 'block', background: 'white', border: '1px solid #E8EDF3', borderRadius: 16,
                overflow: 'hidden', textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
            >
              <div style={{ background: a.color, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>
                {a.emoji}
              </div>
              <div style={{ padding: '20px 20px 24px' }}>
                <span className="badge badge-blue" style={{ marginBottom: 10, display: 'inline-block' }}>{a.category}</span>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1A1A2E', marginBottom: 8, lineHeight: 1.4 }}>{a.title}</h3>
                <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 10 }}>{a.date} &middot; {a.readTime}</div>
                <p style={{ color: '#64748B', fontSize: 13, lineHeight: 1.7, marginBottom: 14 }}>{a.summary}</p>
                <span style={{ color: '#2B7FFF', fontWeight: 700, fontSize: 13 }}>Read More →</span>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p className="text-muted">No articles in this category yet.</p>
          </div>
        )}

      </div>

      <AppFooter />
    </div>
  );
}
