const stylists = ["Tous les coiffeurs", "Sabrina", "Nadia", "Samir"];
const bookingStorageKey = "salonKamelBookings";

const teamStylist = document.querySelector("#teamStylist");
const teamDate = document.querySelector("#teamDate");
const agendaList = document.querySelector("#agendaList");
const appointmentCount = document.querySelector("#appointmentCount");
const selectedDayLabel = document.querySelector("#selectedDayLabel");
const selectedStylistLabel = document.querySelector("#selectedStylistLabel");
const clearDay = document.querySelector("#clearDay");
const toast = document.querySelector("#toast");

function loadBookings() {
  try {
    return JSON.parse(localStorage.getItem(bookingStorageKey)) || [];
  } catch (error) {
    return [];
  }
}

function saveBookings(bookings) {
  localStorage.setItem(bookingStorageKey, JSON.stringify(bookings));
}

function formatDate(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.setTimeout(() => toast.classList.remove("visible"), 3000);
}

function renderStylistOptions() {
  teamStylist.innerHTML = stylists
    .map((stylist) => `<option value="${stylist}">${stylist}</option>`)
    .join("");
}

function setDefaultDate() {
  const today = new Date().toLocaleDateString("en-CA");
  const nextBooking = loadBookings()
    .filter((booking) => booking.date >= today)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];

  teamDate.value = nextBooking?.date || today;
}

function filteredBookings() {
  const stylist = teamStylist.value;
  return loadBookings()
    .filter((booking) => booking.date === teamDate.value)
    .filter((booking) => stylist === "Tous les coiffeurs" || booking.stylist === stylist)
    .sort((a, b) => a.time.localeCompare(b.time));
}

function renderAgenda() {
  const bookings = filteredBookings();
  appointmentCount.textContent = `${bookings.length} rendez-vous`;
  selectedDayLabel.textContent = formatDate(teamDate.value);
  selectedStylistLabel.textContent = teamStylist.value;

  if (!bookings.length) {
    agendaList.innerHTML = `
      <article class="empty-agenda">
        <h2>Aucun rendez-vous</h2>
        <p>Les nouvelles réservations apparaîtront ici dès qu'un client validera le formulaire.</p>
      </article>
    `;
    return;
  }

  agendaList.innerHTML = bookings
    .map(
      (booking) => `
        <article class="appointment-card">
          <div class="appointment-time">
            <strong>${booking.time}</strong>
            <span>${booking.duration} min</span>
          </div>
          <div class="appointment-main">
            <h2>${booking.service}</h2>
            <p>${booking.clientName} - ${booking.phone}</p>
            ${booking.message ? `<p class="appointment-note">${booking.message}</p>` : ""}
          </div>
          <div class="appointment-meta">
            <span>${booking.stylist}</span>
            <button type="button" data-id="${booking.id}">Terminer</button>
          </div>
        </article>
      `
    )
    .join("");
}

function removeBooking(id) {
  saveBookings(loadBookings().filter((booking) => booking.id !== id));
  renderAgenda();
  showToast("Rendez-vous retiré du planning.");
}

renderStylistOptions();
setDefaultDate();
renderAgenda();

teamStylist.addEventListener("change", renderAgenda);
teamDate.addEventListener("change", renderAgenda);

agendaList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  if (button) removeBooking(button.dataset.id);
});

clearDay.addEventListener("click", () => {
  const stylist = teamStylist.value;
  const remaining = loadBookings().filter((booking) => {
    const sameDay = booking.date === teamDate.value;
    const sameStylist = stylist === "Tous les coiffeurs" || booking.stylist === stylist;
    return !(sameDay && sameStylist);
  });

  saveBookings(remaining);
  renderAgenda();
  showToast("La journée affichée a été vidée.");
});
