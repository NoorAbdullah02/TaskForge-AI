import { useState } from 'react';
import { ArrowUp, TrendingUp, Users, ShoppingCart, DollarSign, Eye, Heart, Share2, BarChart3, LineChart } from 'lucide-react';

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');

    // Overview Page
    const OverviewPage = () => (
        <div className="space-y-8">
            {/* Hero Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { icon: DollarSign, label: 'Revenue', value: '$24,850', change: '+12.5%', color: 'from-green-500 to-emerald-600' },
                    { icon: Users, label: 'Users', value: '12,458', change: '+8.2%', color: 'from-blue-500 to-cyan-600' },
                    { icon: ShoppingCart, label: 'Orders', value: '3,842', change: '+23.1%', color: 'from-purple-500 to-pink-600' },
                    { icon: TrendingUp, label: 'Growth', value: '42.8%', change: '+5.6%', color: 'from-orange-500 to-red-600' },
                ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div key={i} className={`relative overflow-hidden rounded-3xl p-6 text-white shadow-2xl bg-gradient-to-br ${stat.color}`}>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <Icon className="w-8 h-8 opacity-80" />
                                    <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">
                                        <ArrowUp className="w-4 h-4" />
                                        {stat.change}
                                    </div>
                                </div>
                                <p className="text-white/80 text-sm font-medium">{stat.label}</p>
                                <p className="text-3xl font-bold">{stat.value}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Chart */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-2xl font-bold text-gray-800">Revenue Trend</h3>
                        <BarChart3 className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="h-64 flex items-end justify-around gap-3">
                        {[45, 52, 48, 71, 65, 78, 82, 75, 88, 92, 85, 91].map((h, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                <div className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-2xl hover:from-blue-600 hover:to-blue-500 transition-all cursor-pointer" style={{ height: `${h * 2}px` }}></div>
                                <span className="text-xs text-gray-500">{i + 1}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stats Card */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 shadow-xl text-white">
                    <h3 className="text-xl font-bold mb-8">Quick Stats</h3>
                    <div className="space-y-6">
                        {[
                            { label: 'Conversion Rate', value: '3.8%', icon: '📊' },
                            { label: 'Bounce Rate', value: '28.5%', icon: '🔄' },
                            { label: 'Avg. Duration', value: '4m 32s', icon: '⏱️' },
                        ].map((stat, i) => (
                            <div key={i} className="flex justify-between items-center pb-4 border-b border-white/10 last:border-0">
                                <div>
                                    <p className="text-white/70 text-sm">{stat.label}</p>
                                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                                </div>
                                <span className="text-2xl">{stat.icon}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    // Analytics Page
    const AnalyticsPage = () => (
        <div className="space-y-8">
            {/* Top Metrics */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
                <h3 className="text-2xl font-bold text-gray-800 mb-8">Traffic Sources</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { source: 'Organic Search', visitors: '8,450', percentage: 68, color: 'bg-blue-500' },
                        { source: 'Direct', visitors: '2,340', percentage: 19, color: 'bg-purple-500' },
                        { source: 'Referral', visitors: '1,890', percentage: 13, color: 'bg-pink-500' },
                    ].map((item, i) => (
                        <div key={i} className="p-6 bg-gray-50 rounded-2xl">
                            <p className="text-gray-600 font-medium mb-2">{item.source}</p>
                            <p className="text-3xl font-bold text-gray-800 mb-4">{item.visitors}</p>
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className={`${item.color} h-full rounded-full transition-all`} style={{ width: `${item.percentage}%` }}></div>
                            </div>
                            <p className="text-sm text-gray-500 mt-2">{item.percentage}% of traffic</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* User Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
                    <h3 className="text-2xl font-bold text-gray-800 mb-6">User Activity</h3>
                    <div className="space-y-4">
                        {[
                            { time: 'Today', active: 2450, color: 'bg-green-500' },
                            { time: 'Yesterday', active: 1890, color: 'bg-blue-500' },
                            { time: 'Last Week', active: 12450, color: 'bg-purple-500' },
                            { time: 'Last Month', active: 45230, color: 'bg-orange-500' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="w-24">
                                    <p className="text-sm font-semibold text-gray-700">{item.time}</p>
                                </div>
                                <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden">
                                    <div className={`${item.color} h-full rounded-full transition-all`} style={{ width: `${(item.active / 50000) * 100}%` }}></div>
                                </div>
                                <p className="w-20 text-right font-semibold text-gray-800">{item.active.toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-3xl p-8 shadow-xl text-white">
                    <h3 className="text-2xl font-bold mb-8">Engagement Metrics</h3>
                    <div className="space-y-6">
                        {[
                            { metric: 'Page Views', value: '124.5K', trend: '↑ 12%' },
                            { metric: 'Click Rate', value: '8.2%', trend: '↑ 3%' },
                            { metric: 'Time on Site', value: '4m 23s', trend: '↑ 8%' },
                            { metric: 'Return Visitors', value: '34.8%', trend: '↑ 5%' },
                        ].map((item, i) => (
                            <div key={i} className="flex justify-between items-center pb-4 border-b border-white/20 last:border-0">
                                <p className="text-white/80">{item.metric}</p>
                                <div className="text-right">
                                    <p className="font-bold text-lg">{item.value}</p>
                                    <p className="text-sm text-green-300">{item.trend}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    // Users Page
    const UsersPage = () => (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[
                    { label: 'Total Users', value: '12,458', icon: '👥' },
                    { label: 'Active Today', value: '2,450', icon: '🟢' },
                    { label: 'New This Week', value: '345', icon: '⭐' },
                ].map((card, i) => (
                    <div key={i} className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100">
                        <div className="text-4xl mb-4">{card.icon}</div>
                        <p className="text-gray-600 text-sm font-medium mb-2">{card.label}</p>
                        <p className="text-3xl font-bold text-gray-800">{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-100">
                    <h3 className="text-2xl font-bold text-gray-800">Recent Users</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-8 py-4 text-left font-bold text-gray-700">User</th>
                                <th className="px-8 py-4 text-left font-bold text-gray-700">Email</th>
                                <th className="px-8 py-4 text-left font-bold text-gray-700">Status</th>
                                <th className="px-8 py-4 text-left font-bold text-gray-700">Joined</th>
                                <th className="px-8 py-4 text-left font-bold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { name: 'Sarah Johnson', email: 'sarah@example.com', status: 'Active', joined: '2 days ago' },
                                { name: 'Michael Chen', email: 'michael@example.com', status: 'Active', joined: '5 days ago' },
                                { name: 'Emma Davis', email: 'emma@example.com', status: 'Inactive', joined: '1 week ago' },
                                { name: 'Alex Wilson', email: 'alex@example.com', status: 'Active', joined: '2 weeks ago' },
                            ].map((user, i) => (
                                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition">
                                    <td className="px-8 py-4 font-semibold text-gray-800">{user.name}</td>
                                    <td className="px-8 py-4 text-gray-600">{user.email}</td>
                                    <td className="px-8 py-4">
                                        <span className={`px-4 py-2 rounded-full text-sm font-bold ${user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4 text-gray-600">{user.joined}</td>
                                    <td className="px-8 py-4">
                                        <button className="text-blue-600 hover:text-blue-800 font-semibold">View</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    // Performance Page
    const PerformancePage = () => (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Performance Score */}
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-8 shadow-xl text-white">
                    <h3 className="text-2xl font-bold mb-8">Performance Score</h3>
                    <div className="relative w-48 h-48 mx-auto mb-8">
                        <div className="absolute inset-0 rounded-full bg-white/20 flex items-center justify-center">
                            <div className="text-center">
                                <p className="text-5xl font-bold">92</p>
                                <p className="text-white/80">Excellent</p>
                            </div>
                        </div>
                        <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="white" strokeWidth="8" opacity="0.2" />
                            <circle cx="50" cy="50" r="45" fill="none" stroke="white" strokeWidth="8" strokeDasharray="282" strokeDashoffset="30" strokeLinecap="round" />
                        </svg>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="space-y-4">
                    {[
                        { label: 'Load Time', value: '1.2s', target: '< 2s', status: 'good' },
                        { label: 'Error Rate', value: '0.02%', target: '< 0.1%', status: 'good' },
                        { label: 'Uptime', value: '99.98%', target: '99%', status: 'excellent' },
                        { label: 'API Response', value: '145ms', target: '< 200ms', status: 'good' },
                    ].map((metric, i) => (
                        <div key={i} className="bg-white rounded-2xl p-4 shadow-lg border-l-4 border-green-500">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">{metric.label}</p>
                                    <p className="text-2xl font-bold text-gray-800">{metric.value}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">Target: {metric.target}</p>
                                    <p className="text-sm font-bold text-green-600">✓ Met</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Detailed Performance */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
                <h3 className="text-2xl font-bold text-gray-800 mb-8">Hourly Performance</h3>
                <div className="h-80 flex items-end justify-around gap-2">
                    {[65, 72, 68, 82, 75, 88, 92, 85, 78, 91, 88, 95, 89, 94, 91, 87, 93, 90, 85, 88, 92, 89, 91, 94].map((val, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group cursor-pointer">
                            <div className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg group-hover:from-blue-600 group-hover:to-blue-500 transition-all" style={{ height: `${val * 2.5}px` }}></div>
                            {i % 4 === 0 && <span className="text-xs text-gray-500">{i}h</span>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const pages = [
        { id: 'overview', label: 'Overview', icon: '📊' },
        { id: 'analytics', label: 'Analytics', icon: '📈' },
        { id: 'users', label: 'Users', icon: '👥' },
        { id: 'performance', label: 'Performance', icon: '⚡' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">Dashboard</h1>
                    <p className="text-gray-600">Welcome back! Here's your performance overview.</p>
                </div>

                {/* Navigation Tabs */}
                <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                    {pages.map((page) => (
                        <button
                            key={page.id}
                            onClick={() => setActiveTab(page.id)}
                            className={`px-6 py-3 rounded-2xl font-semibold transition-all whitespace-nowrap ${
                                activeTab === page.id
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                                    : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
                            }`}
                        >
                            <span className="mr-2">{page.icon}</span>
                            {page.label}
                        </button>
                    ))}
                </div>

                {/* Page Content */}
                <div>
                    {activeTab === 'overview' && <OverviewPage />}
                    {activeTab === 'analytics' && <AnalyticsPage />}
                    {activeTab === 'users' && <UsersPage />}
                    {activeTab === 'performance' && <PerformancePage />}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;