import React from 'react';
import { motion } from 'framer-motion';

const StatsCard = ({
  title,
  value,
  icon: Icon,
  color = "bg-gradient-to-r from-blue-500 to-blue-600",
  textColor = "text-blue-600",
  bgColor = "bg-blue-50"
}) => {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-lg p-2 shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300 flex items-center"
    >
      <div className="flex-shrink-0 mr-2">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`w-4 h-4 ${textColor}`} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-slate-600 text-xs font-medium truncate">{title}</p>
        <p className="text-lg font-bold text-slate-800">{value}</p>
      </div>
    </motion.div>
  );
};

export default StatsCard;
