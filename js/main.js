// Dupli'Clé Express — formulaire de devis et suivi des contacts
(function () {
  var cfg = window.DCE || {};

  // Anciennes adresses (#fiche-...) vers les nouvelles pages service
  var old = {
    '#fiche-ouverture': '/ouverture-voiture/',
    '#fiche-double': '/double-cle-voiture/',
    '#fiche-programmation': '/programmation-cle-voiture/',
    '#fiche-perte': '/perte-totale-cle-voiture/',
    '#fiche-demarrage': '/assistance-demarrage/',
    '#fiche-batterie': '/remplacement-batterie/'
  };
  if (old[location.hash]) location.replace(old[location.hash]);

  // Suivi des clics d'appel / WhatsApp (si Google Analytics ou Ads est installé)
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="tel:"],a[href*="wa.me"],a[href^="sms:"]');
    if (!a) return;
    var type = a.href.indexOf('tel:') === 0 ? 'appel' : a.href.indexOf('sms:') === 0 ? 'sms' : 'whatsapp';
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'contact_' + type, { event_category: 'contact', event_label: location.pathname });
    }
  });

  // Formulaire de devis : ouvre WhatsApp avec le message déjà rempli
  var form = document.getElementById('devis-form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements;
    var lines = [
      'Bonjour Dupli’Clé Express, je souhaite un devis :',
      '• Prestation : ' + f.service.value,
      '• Véhicule : ' + [f.marque.value, f.modele.value, f.annee.value].filter(Boolean).join(' '),
      '• Ville / code postal : ' + f.ville.value,
      '• Urgence : ' + f.urgence.value
    ];
    if (f.message.value.trim()) lines.push('• Précisions : ' + f.message.value.trim());
    if (f.nom.value.trim()) lines.push('Nom : ' + f.nom.value.trim());
    var text = encodeURIComponent(lines.join('\n'));
    if (typeof window.gtag === 'function') window.gtag('event', 'devis_envoye', { event_category: 'contact' });
    window.open('https://wa.me/' + cfg.wa + '?text=' + text, '_blank', 'noopener');
  });
})();
