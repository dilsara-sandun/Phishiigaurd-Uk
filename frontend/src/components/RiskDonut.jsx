import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = {
  phishing: '#ef4444', 
  suspicious: '#f59e0b',
  legitimate: '#22c55e'
}

export default function RiskDonut({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
        <div className="w-16 h-16 rounded-full border-4 border-white/[0.05] border-t-white/[0.1] animate-spin mb-3"></div>
        Awaiting scan data...
      </div>
    )
  }

  const total = data.reduce((acc, curr) => acc + curr.value, 0)

  return (
    <div className="h-full relative flex flex-col pt-2">
      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius="65%"
              outerRadius="90%"
              paddingAngle={5}
              dataKey="value"
              stroke="none"
              cornerRadius={4}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase()]} opacity={0.8} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#0a1628', 
                borderColor: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#fff',
                boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
              }}
              itemStyle={{ color: '#e2e8f0' }}
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
        <span className="text-3xl font-bold text-white tracking-tight">{total}</span>
        <span className="text-xs text-slate-400 font-medium tracking-wide">TOTAL SCANS</span>
      </div>

      <div className="flex justify-center gap-6 mt-4">
        {data.map(item => (
          <div key={item.name} className="flex items-center gap-2">
            <span 
              className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
              style={{ backgroundColor: COLORS[item.name.toLowerCase()], boxShadow: `0 0 10px ${COLORS[item.name.toLowerCase()]}80` }} 
            />
            <span className="text-xs font-medium text-slate-300 capitalize">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
