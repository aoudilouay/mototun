import PartnerDirectoryPage from '../../components/PartnerDirectoryPage';
import partnershipService, { UserRole } from '../../services/partnershipService';

function RevendeursPage() {
  return (
    <PartnerDirectoryPage
      accent="emerald"
      title="Mes Revendeurs"
      kicker="Espace Fournisseur"
      subtitle="Priorisez les revendeurs a activer, repondez vite aux demandes et gardez vos connexions commerciales bien organisees."
      directoryTitle="Annuaire revendeurs"
      emptyTitle="Aucun revendeur trouve"
      emptyMessage="Aucun resultat ne correspond a votre recherche."
      selfRole={UserRole.Fournisseur}
      directoryLoader={partnershipService.getRevendeurDirectory}
      createPayloadKey="revendeurId"
    />
  );
}

export default RevendeursPage;
