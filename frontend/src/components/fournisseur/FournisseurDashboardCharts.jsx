import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function formatMoney(value, locale) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString(locale || 'fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })} TND`;
}

function FournisseurDashboardCharts({ trend, locale, timeRange }) {
  const label = timeRange === 'today' ? "aujourd hui" : timeRange === 'week' ? 'cette semaine' : timeRange === 'year' ? 'cette annee' : 'ce mois';

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-black text-slate-900">Evolution des dossiers</h2>
          <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{label}</span>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
              <Tooltip formatter={(value, name) => [Number(value), name]} />
              <Line type="monotone" dataKey="received" name="Recus" stroke="#0ea5e9" strokeWidth={2.2} dot={false} />
              <Line type="monotone" dataKey="completed" name="Termines" stroke="#16a34a" strokeWidth={2.2} dot={false} />
              <Line type="monotone" dataKey="rejected" name="Rejetes" stroke="#f43f5e" strokeWidth={2.2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-black text-slate-900">Montant dossiers</h2>
          <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">TND</span>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(value) => Number(value).toLocaleString(locale || 'fr-FR')} />
              <Tooltip formatter={(value) => [formatMoney(value, locale), 'Montant']} />
              <Bar dataKey="amount" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  );
}

export default FournisseurDashboardCharts;
