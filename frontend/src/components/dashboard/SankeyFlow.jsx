import React, { useState, useMemo } from 'react';
import { Card } from '../../components/ui/Card.jsx';
import { Info, TrendingDown, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../lib/format.js';
import { cn } from '../../lib/utils.js';

export default function SankeyFlow({ summary }) {
  const [hoveredLink, setHoveredLink] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  const monthlyIncome = Number(summary.monthly_income || 0);
  const monthlyExpenses = Number(summary.monthly_expenses || 0);
  const categories = useMemo(() => summary.category_chart || [], [summary.category_chart]);

  // If there is no income and no expenses, show a placeholder
  if (monthlyIncome === 0 && monthlyExpenses === 0) {
    return (
      <Card className="p-6 bg-zinc-900/30 border-white/5 backdrop-blur-md text-center text-zinc-500 h-64 flex flex-col items-center justify-center gap-2">
        <TrendingDown size={24} className="text-zinc-700 animate-pulse" />
        <p className="text-sm font-semibold">No flow data available</p>
        <p className="text-xs text-zinc-600">Transactions logged this month will populate the flow chart.</p>
      </Card>
    );
  }

  // Dimensions
  const width = 600;
  const height = 260;
  const padding = 20;
  const nodeWidth = 20;

  // X Coordinates of Columns
  const colL = padding;
  const colM = width / 2 - nodeWidth / 2;
  const colR = width - padding - nodeWidth;

  // Let's compute nodes scale
  // Scale matches the height available for drawing
  const maxVolume = Math.max(monthlyIncome, monthlyExpenses);
  const chartHeight = height - padding * 2;
  const scale = maxVolume > 0 ? chartHeight / maxVolume : 1;

  // Node 0: Left Column (Income)
  const leftNodeHeight = Math.max(15, monthlyIncome * scale);
  const leftNodeY = padding + (chartHeight - leftNodeHeight) / 2;

  // Node 1: Middle Column (Total Pool)
  const middleNodeHeight = Math.max(15, maxVolume * scale);
  const middleNodeY = padding + (chartHeight - middleNodeHeight) / 2;

  // Right Column Stack Nodes (Expenses + Savings/Overdraft)
  const rightNodes = [];
  let currentRightY = padding;

  // Add Expenses from category chart
  categories.forEach((cat) => {
    const val = Number(cat.value || 0);
    if (val > 0) {
      const h = Math.max(8, val * scale);
      rightNodes.push({
        id: `cat_${cat.name}`,
        name: cat.name,
        value: val,
        x: colR,
        y: currentRightY,
        height: h,
        color: '#f43f5e', // default red/rose
        type: 'expense'
      });
      currentRightY += h + 6; // gap of 6px
    }
  });

  // Add Savings / Unspent node if income exceeds expenses
  const savingsVal = monthlyIncome - monthlyExpenses;
  if (savingsVal > 0) {
    const h = Math.max(8, savingsVal * scale);
    rightNodes.push({
      id: 'savings',
      name: 'Unspent Savings',
      value: savingsVal,
      x: colR,
      y: currentRightY,
      height: h,
      color: '#3b82f6', // blue
      type: 'savings'
    });
  }

  // Links
  const links = [];
  
  // Link: Left (Income) -> Middle (Total Pool)
  links.push({
    id: 'income_to_pool',
    source: { x: colL + nodeWidth, y: leftNodeY + leftNodeHeight / 2, height: leftNodeHeight },
    target: { x: colM, y: middleNodeY + middleNodeHeight / 2, height: leftNodeHeight },
    value: monthlyIncome,
    name: 'Total monthly cash income',
    color: 'url(#gradient-income-pool)'
  });

  // Links from Middle (Total Pool) to Right stack
  let linkOutletY = middleNodeY;
  rightNodes.forEach((node) => {
    const linkHeight = node.value * scale;
    links.push({
      id: `pool_to_${node.id}`,
      source: { x: colM + nodeWidth, y: linkOutletY + linkHeight / 2, height: linkHeight },
      target: { x: node.x, y: node.y + node.height / 2, height: linkHeight },
      value: node.value,
      name: node.name,
      color: node.type === 'savings' ? 'url(#gradient-pool-savings)' : 'url(#gradient-pool-expense)'
    });
    linkOutletY += linkHeight;
  });

  // Curvature helper for paths
  const getBezierPath = (link) => {
    const { x: x0, y: y0, height: h0 } = link.source;
    const { x: x1, y: y1 } = link.target;
    
    // Control points for smooth horizontal Bezier
    const cx0 = x0 + (x1 - x0) / 2;
    const cx1 = x1 - (x1 - x0) / 2;

    return `M ${x0} ${y0} C ${cx0} ${y0}, ${cx1} ${y1}, ${x1} ${y1}`;
  };

  return (
    <div className="relative overflow-hidden w-full">
      <div className="relative w-full flex justify-center bg-black/10 rounded-xl p-2 border border-white/2">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full max-w-[600px] h-auto overflow-visible select-none"
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="gradient-income-pool" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.45" />
            </linearGradient>
            <linearGradient id="gradient-pool-expense" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="gradient-pool-savings" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
            </linearGradient>
            <filter id="glow-violet" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Links (Paths) */}
          {links.map((link) => {
            const isHovered = hoveredLink === link.id;
            return (
              <path
                key={link.id}
                d={getBezierPath(link)}
                fill="none"
                stroke={link.color}
                strokeWidth={Math.max(2, link.source.height)}
                onMouseEnter={() => setHoveredLink(link.id)}
                onMouseLeave={() => setHoveredLink(null)}
                className={cn(
                  "transition-all duration-200 cursor-pointer",
                  isHovered ? "opacity-100 filter brightness-125" : "opacity-60"
                )}
                style={isHovered ? { filter: 'url(#glow-violet)' } : {}}
              />
            );
          })}

          {/* Left Column Node (Income) */}
          <g 
            onMouseEnter={() => setHoveredNode('income')}
            onMouseLeave={() => setHoveredNode(null)}
            className="cursor-pointer"
          >
            <rect
              x={colL}
              y={leftNodeY}
              width={nodeWidth}
              height={leftNodeHeight}
              rx={4}
              className="fill-emerald-500/85 stroke-emerald-400/20 stroke-1"
            />
            <text
              x={colL + nodeWidth + 6}
              y={leftNodeY + leftNodeHeight / 2 + 4}
              className="text-[10px] font-extrabold fill-zinc-300 pointer-events-none"
            >
              Income ({formatCurrency(monthlyIncome)})
            </text>
          </g>

          {/* Middle Column Node (Cash Pool) */}
          <g 
            onMouseEnter={() => setHoveredNode('pool')}
            onMouseLeave={() => setHoveredNode(null)}
            className="cursor-pointer"
          >
            <rect
              x={colM}
              y={middleNodeY}
              width={nodeWidth}
              height={middleNodeHeight}
              rx={4}
              className="fill-violet-500/85 stroke-violet-400/20 stroke-1"
            />
            <text
              x={colM + nodeWidth / 2}
              y={middleNodeY - 6}
              textAnchor="middle"
              className="text-[9px] font-bold uppercase tracking-wider fill-zinc-400 pointer-events-none"
            >
              Total Pool
            </text>
          </g>

          {/* Right Column Stack Nodes */}
          {rightNodes.map((node) => {
            const isHovered = hoveredNode === node.id;
            return (
              <g 
                key={node.id}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-pointer"
              >
                <rect
                  x={node.x}
                  y={node.y}
                  width={nodeWidth}
                  height={node.height}
                  rx={4}
                  fill={node.color}
                  className="fill-opacity-80 stroke-white/5 stroke-1"
                />
                <text
                  x={node.x - 6}
                  y={node.y + node.height / 2 + 4}
                  textAnchor="end"
                  className="text-[10px] font-bold fill-zinc-300 pointer-events-none"
                >
                  {node.name} ({formatCurrency(node.value)})
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip info on hover */}
        {hoveredLink && (() => {
          const activeLink = links.find(l => l.id === hoveredLink);
          if (!activeLink) return null;
          return (
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-zinc-950/90 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-zinc-300 shadow-xl backdrop-blur-md pointer-events-none animate-fade-in">
              <span className="font-semibold text-white">{activeLink.name}</span>: {formatCurrency(activeLink.value)}
              {monthlyIncome > 0 && (
                <span className="text-zinc-500 ml-1.5">({((activeLink.value / monthlyIncome) * 100).toFixed(0)}%)</span>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
