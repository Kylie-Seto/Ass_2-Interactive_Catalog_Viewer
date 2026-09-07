let allItems = [];

const fileUpload = document.getElementById("fileUpload");
const typeFilter = document.getElementById("typeFilter");
const sortFilter = document.getElementById("sortFilter");
const formMsg = document.getElementById("formMsg");
const resultsCount = document.getElementById("resultsCount");
const cardRow = document.getElementById("cardRow");
const noResults = document.getElementById("noResults");

if (fileUpload) {
  fileUpload.addEventListener("change", function (event) {
    console.log("File input changed.");
    const file = event.target.files[0];

    if (file) {
      if (!file.type.includes("text") && !file.name.endsWith(".csv")) {
        alert("Please upload a valid .csv file.");
        setFormMsg("Please upload a valid .csv file.", "text-danger");
        return;
      }

      const reader = new FileReader(); // built-in browser API

      reader.onload = function (e) {
        try {
          const text = e.target.result; // entire file as a plain string
          parseCSV(text);
        } catch (error) {
          console.error("Error parsing file:", error);
          alert("Error parsing file. Please ensure it is a valid CSV.");
          setFormMsg("Error parsing file.", "text-danger");
        }
      };

      reader.readAsText(file); // begins async read; triggers onload when done
    } else {
      console.log("No file selected.");
      setFormMsg("Upload a CSV to begin.", "text-muted");
    }
  });
} else {
  console.error("fileUpload element not found!");
}

function parseCSV(text) {
  // trim whitespace and split by \n, then filter out any empty lines
  const lines = text
    .trim()
    .split("\n")
    .filter((line) => line.trim() !== "");

  // Guard: file must have at least a header row and one data row
  if (lines.length < 2) {
    alert("The CSV file appears to be empty or missing data rows.");
    setFormMsg("CSV is empty or invalid.", "text-danger");
    return;
  }

  // Row 0 is the header — use it as property keys
  const headers = lines[0].split(",").map((h) => h.trim());

  allItems = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");

    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] ?? "";
    });

    allItems.push(new CatalogItem(obj));
  }
  noResults.classList.add("d-none"); // hide "No results" message on new upload
  setFormMsg(`Loaded ${allItems.length} items.`, "text-muted");
  populateFilters();
  enableControls();
  renderResults();
}

class CatalogItem {
  constructor({ title, type, author, year, genre, rating, description }) {
    this.title = title.trim();
    this.type = type.trim();
    this.author = author.trim();
    this.year = parseInt(year.trim(), 10); // stored as number
    this.genre = genre.trim();
    this.rating = parseFloat(rating.trim()); // stored as number
    this.description = description.trim();
  }

  matchesFilter({ type, genre }) {
    const typeMatch = type === "All" || this.type === type;
    const genreMatch = genre === "All" || this.genre === genre;
    return typeMatch && genreMatch;
  }

  toCard() {
    // Column wrapper — controls responsive grid sizing
    const col = document.createElement("div");
    col.className = "col-lg-4 col-md-6 col-sm-12 mb-4";

    // Card
    const card = document.createElement("div");
    card.className = "card h-100 catalog-card";
    card.style.cursor = "pointer";

    // Card body
    const body = document.createElement("div");
    body.className = "card-body d-flex flex-column";

    // Title
    const titleEl = document.createElement("h5");
    titleEl.className = "card-title";
    titleEl.textContent = this.title;

    // Author
    const authorEl = document.createElement("p");
    authorEl.className = "card-subtitle text-muted mb-2";
    authorEl.textContent = `by ${this.author}`;

    // Type · year · rating row
    const metaEl = document.createElement("p");
    metaEl.className = "card-text mb-1";
    metaEl.innerHTML = `<span class="badge-type">${this.type}</span> &nbsp; ${this.year} &nbsp; &#11088; ${this.rating.toFixed(1)}`;

    // Genre
    const genreEl = document.createElement("p");
    genreEl.className = "card-text";
    genreEl.innerHTML = `<small class="text-muted">${this.genre}</small>`;

    body.appendChild(titleEl);
    body.appendChild(authorEl);
    body.appendChild(metaEl);
    body.appendChild(genreEl);
    card.appendChild(body);
    col.appendChild(card);

    // Click → populate and show detail modal
    card.addEventListener("click", () => {
      document.getElementById("modalTitle").textContent = this.title;
      document.getElementById("modalType").textContent = `Type: ${this.type}`;
      document.getElementById("modalAuthor").textContent =
        `Author: ${this.author}`;
      document.getElementById("modalGenre").textContent =
        `Genre: ${this.genre}`;
      document.getElementById("modalYear").textContent = `Year: ${this.year}`;
      document.getElementById("modalRating").textContent =
        `Rating: ${this.rating.toFixed(1)}`;
      document.getElementById("modalDescription").textContent =
        this.description;

      const modal = new bootstrap.Modal(document.getElementById("itemModal"));
      modal.show();
    });

    return col;
  }
}

function setFormMsg(msg, cls = "text-muted") {
  formMsg.textContent = msg;
  formMsg.className = `pt-3 ${cls}`;
}

function populateFilters() {
  const types = [...new Set(allItems.map((item) => item.type))].sort();

  typeFilter.innerHTML = `<option value="All">All</option>`;
  types.forEach((type) => {
    const opt = document.createElement("option");
    opt.value = type;
    opt.textContent = type;
    typeFilter.appendChild(opt);
  });
}

// enables filter and sort dropdowns after  CSV is loaded
function enableControls() {
  typeFilter.disabled = false;
  sortFilter.disabled = false;
}

// Re-render whenever the user changes a filter or sort option
typeFilter.addEventListener("change", renderResults);
sortFilter.addEventListener("change", renderResults);

function renderResults() {
  const selectedType = typeFilter.value;
  const selectedSort = sortFilter.value;

  // Filter
  let results = allItems.filter((item) =>
    item.matchesFilter({ type: selectedType, genre: "All" }),
  );

  // Sort
  if (selectedSort === "Year (new → old)") {
    results.sort((a, b) => b.year - a.year);
  } else if (selectedSort === "Year (old → new)") {
    results.sort((a, b) => a.year - b.year);
  } else if (selectedSort === "Rating (high → low)") {
    results.sort((a, b) => b.rating - a.rating);
  } else if (selectedSort === "Rating (low → high)") {
    results.sort((a, b) => a.rating - b.rating);
  }

  renderCards(results);
}

function renderCards(items) {
  cardRow.innerHTML = "";

  // Update the <span id="resultsCount"> inside the Results header
  resultsCount.textContent = items.length;

  if (items.length === 0) {
    noResults.classList.remove("d-none");
    noResults.classList.add("d-flex");
    return;
  }

  noResults.classList.add("d-none");
  noResults.classList.remove("d-flex");

  items.forEach((item) => {
    cardRow.appendChild(item.toCard());
  });
}
