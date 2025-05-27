'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface IconComponent {
  className?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<IconComponent>;
  subtitle?: string;
  color?: 'default' | 'purple' | 'blue' | 'green' | 'yellow' | 'red';
}

export default function StatCard({ 
  title, 
  value, 
  icon: Icon,
  subtitle,
  color = 'default'
}: StatCardProps) {
  const colorClasses = {
    default: 'from-white/10 to-white/5',
    purple: 'from-purple-500/20 to-purple-500/5',
    blue: 'from-blue-500/20 to-blue-500/5',
    green: 'from-green-500/20 to-green-500/5',
    yellow: 'from-yellow-500/20 to-yellow-500/5',
    red: 'from-red-500/20 to-red-500/5'
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${colorClasses[color]} p-6 border border-white/10`}
    >
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 opacity-10">
        <Icon className="w-full h-full" />
      </div>
      <div className="relative">
        <div className="text-gray-400 text-sm">{title}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
        {subtitle && (
          <div className="text-xs text-gray-500 mt-2">{subtitle}</div>
        )}
      </div>
    </motion.div>
  );
}
