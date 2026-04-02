import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { useI18n } from '../context/I18nContext';

function PrivacyPolicyPage() {
  const { isArabic } = useI18n();

  const copy = isArabic
    ? {
        backHome: 'العودة إلى الصفحة الرئيسية',
        title: 'سياسة الخصوصية',
        updatedAt: 'آخر تحديث: 23 فبراير 2026',
        sections: [
          {
            title: '1. البيانات التي نجمعها',
            body: 'نجمع البيانات الضرورية لتشغيل الخدمة: بيانات الهوية، معلومات الاتصال، بيانات الفوترة ومعلومات متابعة الملفات.'
          },
          {
            title: '2. أغراض المعالجة',
            body: 'نستخدم البيانات لإدارة الحسابات، إنشاء الوثائق، تأمين المنصة، تقديم الدعم والامتثال للالتزامات القانونية.'
          },
          {
            title: '3. مدة الاحتفاظ',
            body: 'يتم الاحتفاظ بالبيانات للمدة اللازمة فقط لتحقيق الأغراض المذكورة ثم أرشفتها أو حذفها وفق المتطلبات التنظيمية.'
          },
          {
            title: '4. مشاركة البيانات',
            body: 'لا نقوم ببيع البيانات. وقد تتم مشاركتها فقط مع مزودي خدمات تقنية (الاستضافة، البريد، الأمن) لتنفيذ الخدمة.'
          },
          {
            title: '5. حقوقكم',
            body: 'لديكم حق الوصول والتصحيح والحذف والاعتراض. لأي طلب متعلق بالخصوصية: privacy@tunimoto.tn'
          },
          {
            title: '6. الأمان',
            body: 'تعتمد TuniMoto إجراءات تنظيمية وتقنية للحماية، تشمل التشفير، التحكم في الوصول، وتسجيل العمليات الحساسة.'
          }
        ]
      }
    : {
        backHome: 'Retour accueil',
        title: 'Politique de confidentialité',
        updatedAt: 'Dernière mise à jour: 23 février 2026',
        sections: [
          {
            title: '1. Données collectées',
            body: 'Nous collectons les informations nécessaires au fonctionnement du service: identité utilisateur, informations de contact, données de facturation et de suivi.'
          },
          {
            title: '2. Finalités',
            body: 'Les données sont utilisées pour gérer les comptes, générer les documents, sécuriser la plateforme, assurer le support et respecter les obligations légales.'
          },
          {
            title: '3. Conservation',
            body: 'Les données sont conservées pendant la durée strictement nécessaire aux finalités décrites, puis archivées ou supprimées selon la réglementation.'
          },
          {
            title: '4. Partage',
            body: "Les données ne sont pas vendues. Elles peuvent être partagées uniquement avec des sous-traitants techniques (hébergement, email, sécurité) pour l'exécution du service."
          },
          {
            title: '5. Vos droits',
            body: "Vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition. Contact: privacy@tunimoto.tn"
          },
          {
            title: '6. Sécurité',
            body: "TuniMoto applique des mesures de protection organisationnelles et techniques incluant chiffrement, contrôle d'accès et journalisation."
          }
        ]
      };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 via-white to-slate-50 text-slate-900">
      <header className="border-b border-cyan-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <BrandLogo imageClassName="h-10 w-auto rounded-md border border-slate-200" />
            <span className="text-lg font-bold text-slate-900">TuniMoto</span>
          </Link>
          <Link
            to="/"
            className="rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100"
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
            <section key={section.title} className="rounded-2xl border border-cyan-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{section.body}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

export default PrivacyPolicyPage;
