  const nextOpenDay = new Date(today);

  while (!openingHours[nextOpenDay.getDay()]) {
    nextOpenDay.setDate(nextOpenDay.getDate() + 1);
  }

  const iso = today.toLocaleDateString("en-CA");
  const defaultDate = nextOpenDay.toLocaleDateString("en-CA");
  dateInput.min = iso;
  dateInput.value = defaultDate;
}

function updateTimes() {
  const date = new Date(`${dateInput.value}T12:00:00`);
  const day = date.getDay();
  const stylist = selectedStylist();
  const hours = openingHours[day];

  timeSelect.innerHTML = "";

  if (!hours || !stylist.days.includes(day)) {
    const option = new Option("Aucun créneau disponible ce jour", "");
    timeSelect.append(option);
    timeSelect.disabled = true;
    updateSummary();
    return;
  }

  const service = selectedService();
  const start = minutes(hours.start);
  const end = minutes(hours.end) - service.duration;

  for (let slot = start; slot <= end; slot += 30) {
    const slotLabel = timeLabel(slot);
    if (isSlotAvailable(dateInput.value, stylist.name, slotLabel, service.duration)) {
      timeSelect.append(new Option(slotLabel, slotLabel));
    }
  }

  if (!timeSelect.options.length) {
    const option = new Option("Complet pour ce coiffeur", "");
    timeSelect.append(option);
    timeSelect.disabled = true;
    updateSummary();
    return;
  }

  timeSelect.disabled = false;
  updateSummary();
}

function formatDate(value) {
  if (!value) return "date à choisir";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

function updateSummary() {
  const service = selectedService();
  const stylist = selectedStylist();
  const time = timeSelect.value || "horaire à confirmer";

  summary.innerHTML = `
    <strong>${service.name}</strong> avec <strong>${stylist.name}</strong><br />
    ${formatDate(dateInput.value)} à ${time}<br />
    Durée estimée : ${service.duration} min - ${service.price}
  `;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.setTimeout(() => toast.classList.remove("visible"), 3600);
}

function showBookingSaved(booking) {
  summary.innerHTML = `
    <strong>Rendez-vous ajouté au planning.</strong><br />
    ${booking.time} - ${booking.service} avec ${booking.stylist}<br />
    Client : ${booking.clientName}<br />
    <a href="equipe.html">Voir le planning équipe</a>
  `;
}

async function submitBooking(event) {
  event.preventDefault();

  if (timeSelect.disabled || !timeSelect.value) {
    showToast("Choisissez un jour ouvert pour ce coiffeur.");
    return;
  }

  const form = new FormData(bookingForm);
  const service = selectedService();
  await refreshBookings();

  const booking = {
    createdAt: new Date().toISOString(),
    clientName: form.get("name"),
    phone: form.get("phone"),
    service: service.name,
    duration: service.duration,
    stylist: form.get("stylist"),
    date: form.get("date"),
    time: form.get("time"),
    message: form.get("message") || "",
    status: "confirmé"
  };

  if (!isSlotAvailable(booking.date, booking.stylist, booking.time, booking.duration)) {
    showToast("Ce créneau vient d'être pris. Choisissez un autre horaire.");
    updateTimes();
    return;
  }

  const lines = [
    "Bonjour Salon Kamel, je souhaite prendre rendez-vous.",
    `Nom : ${booking.clientName}`,
    `Téléphone : ${booking.phone}`,
    `Prestation : ${booking.service}`,
    `Coiffeur souhaité : ${booking.stylist}`,
    `Date : ${formatDate(booking.date)}`,
    `Heure : ${booking.time}`,
    booking.message ? `Message : ${booking.message}` : ""
  ].filter(Boolean);

  const savedBooking = await createBooking(booking);
  cachedBookings.push(savedBooking);
  showBookingSaved(savedBooking);

  const subject = `Demande de rendez-vous - ${savedBooking.clientName}`;
  const body = lines.join("\n");
  const mailto = `mailto:${bookingEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  navigator.clipboard?.writeText(body);
  showToast("Rendez-vous ajouté au planning. Le mail est prêt à envoyer.");
  window.location.href = mailto;
}

async function init() {
  renderServices();
  renderStylists();
  setMinimumDate();
  await refreshBookings();
  updateTimes();
}

serviceSelect.addEventListener("change", updateTimes);
stylistSelect.addEventListener("change", updateTimes);
dateInput.addEventListener("change", async () => {
  await refreshBookings();
  updateTimes();
});
timeSelect.addEventListener("change", updateSummary);
bookingForm.addEventListener("submit", submitBooking);

init();
