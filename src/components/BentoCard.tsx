import React from 'react';
import { motion } from 'motion/react';

interface BentoCardProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  index?: number; // Used for staggered transition delays
  onClick?: () => void;
  hoverScale?: boolean;
  key?: React.Key;
}

export default function BentoCard({
  id,
  children,
  className = '',
  index = 0,
  onClick,
  hoverScale = true,
}: BentoCardProps) {
  // Staggered entry transition calculation
  const delay = index * 0.04;

  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.35,
        ease: [0.16, 1, 0.3, 1], // Custom cubic-bezier for snappy, upscale modern feel
        delay: delay
      }
    }
  };

  const isClickable = !!onClick;

  return (
    <motion.div
      id={id}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={hoverScale && isClickable ? { scale: 1.012, y: -2 } : undefined}
      whileTap={isClickable ? { scale: 0.988 } : undefined}
      onClick={onClick}
      className={`
        bg-white 
        rounded-2xl md:rounded-[1.75rem] 
        border border-slate-200/80 
        shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05),0_10px_20px_-15px_rgba(0,0,0,0.03)] 
        transition-[border-color,background-color] duration-200 
        relative overflow-hidden
        ${isClickable ? 'cursor-pointer hover:border-orange-300' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}
