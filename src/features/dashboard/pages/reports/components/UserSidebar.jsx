import React, { useState } from 'react';
import { Search, User, ShieldCheck } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/utils/cn';

const UserSidebar = ({ users, selectedUser, onSelectUser, loading }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = users.filter(user =>
        `${user.nombre_completo} ${user.apellido_completo}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.rol?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-white border-r border-slate-200 w-80 min-w-[320px]">
            <div className="p-6">
                <h2 className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-6 px-1">
                    Administrativos
                </h2>
                <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <Input
                        placeholder="Buscar..."
                        className="pl-9 bg-slate-50 border-none h-10 ring-offset-0 focus-visible:ring-1 focus-visible:ring-indigo-500 rounded-lg text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
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
                                        "w-full flex items-center gap-4 px-4 py-4 transition-all duration-200 text-left relative rounded-xl mb-1",
                                        isSelected
                                            ? "bg-[#EEF2FF] text-[#4338CA]"
                                            : "hover:bg-slate-50 text-slate-500"
                                    )}
                                >
                                    <div className="relative flex-shrink-0">
                                        <Avatar className="w-11 h-11 border-2 border-white shadow-sm rounded-full">
                                            {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                                            <AvatarFallback className={cn(
                                                "font-bold text-xs uppercase",
                                                isSelected ? "bg-indigo-600 text-white" : "bg-orange-100 text-orange-600"
                                            )}>
                                                {initials || <User className="w-4 h-4" />}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className={cn(
                                            "text-sm font-bold uppercase truncate leading-tight",
                                            isSelected ? "text-indigo-900" : "text-[#475569]"
                                        )}>
                                            {user.nombre_completo} {user.apellido_completo}
                                        </p>
                                        <p className="text-xs text-slate-400 font-semibold truncate mt-0.5">
                                            {user.rol || 'Administrativo'}
                                        </p>
                                        <p className="text-[11px] text-slate-400 font-medium truncate">
                                            {user.correo}
                                        </p>
                                    </div>

                                    {isSelected && (
                                        <div className="w-1 h-8 bg-indigo-600 rounded-full absolute right-0" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-10 text-center">
                        <User className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                        <p className="text-sm font-semibold text-slate-400">No se encontraron resultados</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserSidebar;
