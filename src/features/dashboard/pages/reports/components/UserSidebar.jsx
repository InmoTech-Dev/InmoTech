import React, { useState } from 'react';
import { Search, User, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/utils/cn';

const UserSidebar = ({ users, selectedUser, onSelectUser, loading, isCollapsed, onToggle }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = users.filter(user =>
        `${user.nombre_completo} ${user.apellido_completo}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.rol?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={cn(
            "flex flex-col h-full bg-white border-r border-slate-200 transition-all duration-300 relative",
            isCollapsed ? "w-20 min-w-[80px]" : "w-72 min-w-[260px]"
        )}>
            {/* Toggle Button */}
            <button
                onClick={onToggle}
                className="absolute -right-3.5 top-20 w-7 h-7 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md text-slate-400 hover:text-indigo-600 transition-all z-50 cursor-pointer"
            >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            <div className={cn("p-5", isCollapsed && "px-3 items-center flex flex-col")}>
                {!isCollapsed && (
                    <h2 className="text-[11px] uppercase font-black text-slate-400 mb-5 px-1 tracking-widest opacity-80">
                        Administrativos
                    </h2>
                )}

                <div className="relative mb-2 w-full">
                    {isCollapsed ? (
                        <div className="flex justify-center text-slate-300 py-2">
                            <Search className="w-5 h-5" />
                        </div>
                    ) : (
                        <>
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <Input
                                placeholder="Buscar..."
                                className="pl-9 bg-slate-50 border-none h-11 ring-offset-0 focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl text-sm font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="p-6 space-y-6">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex items-center gap-4 animate-pulse px-1">
                                <div className="w-11 h-11 bg-slate-100 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3.5 bg-slate-100 rounded w-3/4" />
                                    <div className="h-2.5 bg-slate-50 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredUsers.length > 0 ? (
                    <div className="pb-4 px-2">
                        {filteredUsers.map((user) => {
                            const isSelected = selectedUser?.id_persona === user.id_persona;
                            const initials = `${user.nombre_completo?.[0] || ''}${user.apellido_completo?.[0] || ''}`.toUpperCase();

                            return (
                                <button
                                    key={user.id_persona}
                                    onClick={() => onSelectUser(user)}
                                    className={cn(
                                        "w-full flex items-center transition-all duration-200 text-left relative mb-1",
                                        isCollapsed ? "justify-center p-2 rounded-xl" : "gap-3 px-4 py-4 rounded-2xl",
                                        isSelected
                                            ? "bg-[#EEF2FF] text-[#4338CA] shadow-sm"
                                            : "hover:bg-slate-50 text-slate-500"
                                    )}
                                    title={isCollapsed ? `${user.nombre_completo} ${user.apellido_completo}` : undefined}
                                >
                                    <div className="relative flex-shrink-0">
                                        <Avatar className={cn(
                                            "border-2 border-white shadow-md rounded-full",
                                            isCollapsed ? "w-10 h-10" : "w-11 h-11"
                                        )}>
                                            {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                                            <AvatarFallback className={cn(
                                                "font-bold text-xs uppercase",
                                                isSelected ? "bg-indigo-600 text-white" : "bg-orange-100 text-orange-600"
                                            )}>
                                                {initials || <User className={isCollapsed ? "w-3.5 h-3.5" : "w-4 h-4"} />}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>

                                    {!isCollapsed && (
                                        <div className="flex-1 min-w-0">
                                            <p className={cn(
                                                "text-sm font-black uppercase truncate leading-tight tracking-tight",
                                                isSelected ? "text-indigo-900" : "text-[#1E293B]"
                                            )}>
                                                {user.nombre_completo} {user.apellido_completo}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-bold truncate mt-1 uppercase tracking-wider opacity-80">
                                                {user.rol || 'Administrativo'}
                                            </p>
                                            <p className="text-[10px] text-slate-400/70 font-medium truncate mt-0.5">
                                                {user.correo}
                                            </p>
                                        </div>
                                    )}

                                    {isSelected && !isCollapsed && (
                                        <div className="w-1 h-8 bg-indigo-600 rounded-full absolute right-0" />
                                    )}

                                    {isSelected && isCollapsed && (
                                        <div className="w-1 h-6 bg-indigo-600 rounded-full absolute right-0" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <User className="w-16 h-16 text-slate-100 mx-auto mb-6 opacity-50" />
                        <p className="text-base font-bold text-slate-300">No se encontraron resultados</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserSidebar;
