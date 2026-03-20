"use client"
import { motion, AnimatePresence } from "framer-motion"

const SidebarItem = ({ item, isCollapsed, isExpanded, isActive, activeSubItem, onItemClick, onSubItemClick }) => {
  const hasSubItems = item.subItems && item.subItems.length > 0

  return (
    <div className="relative">
      {/* Item Principal */}
      <motion.div
        whileHover={{ 
          scale: 1.02, 
          x: 4,
          backgroundColor: isActive ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.08)'
        }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onItemClick(item)}
        className={`
          flex items-center justify-between px-4 py-1 md:py-2 mx-2 rounded-xl cursor-pointer transition-all duration-300 group relative overflow-hidden
          ${
            isActive
              ? "bg-gradient-to-r from-blue-600/20 via-blue-500/15 to-cyan-500/10 text-white border border-blue-400/40 shadow-lg shadow-blue-500/20"
              : "text-slate-300 hover:text-white hover:bg-slate-700/50 border border-transparent hover:border-slate-600/50"
          }
        `}
      >
        {/* Efecto de brillo para item activo */}
        {isActive && (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-transparent to-cyan-400/10 animate-pulse" />
        )}
        
        <div className="flex items-center relative z-10">
          <div
            className={`
            flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 relative
            ${
              isActive
                ? "text-blue-200 bg-blue-500/30 shadow-md shadow-blue-500/30"
                : "text-slate-400 group-hover:text-white group-hover:bg-slate-600/50"
            }
          `}
          >
            <item.icon size={20} />
          </div>

          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="ml-2 md:ml-3 font-medium text-sm relative z-10"
              >
                {item.title}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Indicador de expansión */}
        {hasSubItems && !isCollapsed && (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className={`
              text-xs transition-colors duration-300 relative z-10
              ${isActive ? "text-blue-200" : "text-slate-400 group-hover:text-white"}
            `}
          >
            ▼
          </motion.div>
        )}

        {/* Barra lateral de item activo */}
        {isActive && (
          <motion.div
            initial={{ scaleY: 0, x: 10 }}
            animate={{ scaleY: 1, x: 0 }}
            className="absolute right-0 top-3/6 -translate-y-1/2 w-1 h-16 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-full shadow-lg shadow-blue-400/50"
          />
        )}
      </motion.div>

      {/* Sub Items */}
      <AnimatePresence>
        {hasSubItems && isExpanded && !isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="ml-4 mt-2 space-y-1 md:space-y-1.5 relative"
          >
            {/* Barra lateral izquierda para indicar sección expandida */}
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-400/60 via-blue-300/40 to-transparent rounded-full" />
            
            {item.subItems.map((subItem, index) => (
              <motion.div
                key={subItem.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
                whileHover={{ 
                  scale: 1, 
                  x: 0
                }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSubItemClick(subItem.id)}
                className={`
                  flex items-center pl-4 md:pl-6 pr-4 py-1.5 md:py-2.5 ml-2 mr-2 rounded-lg cursor-pointer transition-all duration-300 group relative
                  ${
                    activeSubItem === subItem.id
                      ? "bg-gradient-to-r from-emerald-500/15 via-emerald-400/10 to-transparent text-emerald-100 border-l-2 border-emerald-400/60 shadow-md shadow-emerald-500/10"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30 hover:border-l-2 hover:border-r hover:border-slate-500/50 border-l-2 border-transparent"
                  }
                `}
              >
                {/* Punto decorativo */}
                <div
                  className={`
                  w-1.5 h-1.5 rounded-full mr-3 transition-all duration-300 flex-shrink-0
                  ${
                    activeSubItem === subItem.id
                      ? "bg-emerald-400 shadow-md shadow-emerald-400/50"
                      : "bg-slate-500 group-hover:bg-slate-400"
                  }
                `}
                />
                
                <span className="text-sm font-medium flex-1">{subItem.title}</span>
                
                {/* Pequeño indicador de item activo */}
                {activeSubItem === subItem.id && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-1 h-1 bg-emerald-400 rounded-full shadow-sm shadow-emerald-400/60 ml-2"
                  />
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SidebarItem