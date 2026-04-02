import PartnerDirectoryPage from '../../components/PartnerDirectoryPage';
import partnershipService, { UserRole } from '../../services/partnershipService';

function FournisseursPage() {
  return (
    <PartnerDirectoryPage
      accent="blue"
      title="Mes Fournisseurs"
      kicker="Espace Revendeur"
      subtitle="Reperez les fournisseurs a contacter, traitez les demandes entrantes et gardez votre reseau pret pour vos prochains dossiers."
      directoryTitle="Annuaire fournisseurs"
      emptyTitle="Aucun fournisseur trouve"
      emptyMessage="Aucun resultat ne correspond a votre recherche."
      selfRole={UserRole.Revendeur}
      directoryLoader={partnershipService.getFournisseurDirectory}
      createPayloadKey="fournisseurId"
    />
  );
}

export default FournisseursPage;
