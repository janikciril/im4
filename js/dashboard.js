(() => {
  const form = document.getElementById("roomCreateForm");
  const input = document.getElementById("newRoomName");
  const addButton = document.getElementById("addRoomBtn");
  const roomsList = document.getElementById("roomsList");
  const roomCount = document.querySelector('[data-bind="roomCount"]');
  const activeRoomName = document.querySelector('[data-bind="activeRoomName"]');

  if (!form || !input || !addButton || !roomsList || !roomCount || !activeRoomName) {
    return;
  }

  const updateRoomCount = () => {
    const roomChips = roomsList.querySelectorAll(".room-chip");
    roomCount.textContent = String(roomChips.length);
  };

  const setActiveRoom = (chip) => {
    const chips = roomsList.querySelectorAll(".room-chip");
    chips.forEach((item) => item.classList.remove("chip-active"));
    chip.classList.add("chip-active");
    activeRoomName.textContent = chip.textContent;
  };

  const addRoomChip = (roomName) => {
    const newChip = document.createElement("button");
    newChip.type = "button";
    newChip.className = "chip room-chip";
    newChip.textContent = roomName;

    newChip.addEventListener("click", () => {
      setActiveRoom(newChip);
    });

    roomsList.appendChild(newChip);
    setActiveRoom(newChip);
    updateRoomCount();
    newChip.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  };

  roomsList.querySelectorAll(".room-chip").forEach((chip) => {
    chip.addEventListener("click", () => setActiveRoom(chip));
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const roomName = input.value.trim();
    if (!roomName) {
      input.focus();
      return;
    }

    const exists = Array.from(roomsList.querySelectorAll(".room-chip")).some(
      (chip) => chip.textContent.toLowerCase() === roomName.toLowerCase()
    );

    if (exists) {
      input.focus();
      input.select();
      return;
    }

    addButton.disabled = true;
    addRoomChip(roomName);
    input.value = "";
    addButton.disabled = false;
    input.focus();
  });
})();
