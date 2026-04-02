import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { useI18n } from '../context/I18nContext';

function LegalPage() {
  const { isArabic } = useI18n();

  const copy = isArabic
    ? {
        backHome: 'العودة إلى الصفحة الرئيسية',
        title: 'المعلومات القانونية',
        updatedAt: 'آخر تحديث: 23 فبراير 2026',
        sections: [
          {
            title: 'الجهة المشغلة للموقع',
            body: 'موقع TuniMoto.tn يتم تشغيله من طرف TuniMoto SARL وهي شركة خاضعة للقانون التونسي.',
            extra: 'البريد القانوني: legal@tunimoto.tn'
          },
          {
            title: 'الاستضافة',
            body: 'تستضاف المنصة على بنية تحتية آمنة داخل الاتحاد الأوروبي لضمان الموثوقية والحماية.'
          },
          {
            title: 'الملكية الفكرية',
            body: 'جميع عناصر المنصة (العلامة، التصميم، النصوص، الكود والمحتوى) محمية قانونيا. أي نسخ غير مصرح به ممنوع.'
          },
          {
            title: 'المسؤولية',
            body: 'تلتزم TuniMoto باتخاذ الإجراءات المعقولة لضمان توفر المنصة وأمانها، دون ضمان التشغيل دون انقطاع.'
          },
          {
            title: 'القانون المعمول به',
            body: 'تخضع هذه المعلومات القانونية للقانون التونسي، وتختص محاكم تونس بالنظر في أي نزاع.'
          }
        ]
      }
    : {
        backHome: 'Retour accueil',
        title: 'Mentions légales',
        updatedAt: 'Dernière mise à jour: 23 février 2026',
        sections: [
          {
            title: 'Éditeur du site',
            body: 'Le site TuniMoto.tn est opéré par TuniMoto SARL, société de droit tunisien.',
            extra: 'Email légal: legal@tunimoto.tn'
          },
          {
            title: 'Hébergement',
            body: "La plateforme est hébergée sur une infrastructure sécurisée située dans l'Union européenne."
          },
          {
            title: 'Propriété intellectuelle',
            body: 'Les éléments de la plateforme (marque, design, textes, code et contenus) sont protégés. Toute reproduction non autorisée est interdite.'
          },
          {
            title: 'Responsabilité',
            body: 'TuniMoto met en œuvre des moyens raisonnables pour assurer la disponibilité et la sécurité du service, sans garantir une disponibilité ininterrompue.'
          },
          {
            title: 'Droit applicable',
            body: 'Les présentes mentions sont soumises au droit tunisien. En cas de litige, les juridictions de Tunis sont compétentes.'
          }
        ]
      };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-slate-50 text-slate-900">
      <header className="border-b border-blue-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <BrandLogo imageClassName="h-10 w-auto rounded-md border border-slate-200" />
            <span className="text-lg font-bold text-slate-900">TuniMoto</span>
          </Link>
          <Link
            to="/"
            className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            {copy.backHome}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">{copy.title}</h1>
        <p className="mt-2 text-sm text-slate-500">{copy.updatedAt}</p>

        <div className="mt-8 space-y-5">
          {copy.sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{section.body}</p>
              {section.extra && <p className="mt-2 text-sm text-slate-600">{section.extra}</p>}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

export default LegalPage;
