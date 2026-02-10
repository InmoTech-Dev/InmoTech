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
      className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300 flex items-center"
    >
      <div className="flex-shrink-0 mr-4">
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <Icon className={`w-6 h-6 ${textColor}`} />
        </div>
      </div>
      <div className="flex-1">
        <p className="text-slate-600 text-sm font-medium truncate">{title}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </motion.div>
  );
};

export default StatsCard;
