(function () {
  // 1. Deteksi otomatis key provider dari <body data-provider="..."> atau nama file (misal axis.html -> "axis")
  function detectProviderKey() {
    if (document.body && document.body.dataset.provider) {
      return document.body.dataset.provider.trim().toLowerCase();
    }
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("p")) {
      return urlParams.get("p").trim().toLowerCase();
    }
    const fileName = window.location.pathname.split("/").pop() || "";
    return fileName.replace(/\.html$/i, "").trim().toLowerCase();
  }

  // 2. Fetch product.json dengan cache-buster agar harga baru langsung muncul setelah Push
  async function loadCatalog() {
    const providerKey = detectProviderKey();
    const container = document.getElementById("paketContainer");

    try {
      const res = await fetch(`./product.json?v=${Date.now()}`, {
        cache: "no-store"
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const catalog = await res.json();
      const providerData = catalog.produk && catalog.produk[providerKey];

      if (!providerData) {
        if (container) {
          container.innerHTML = `<p style="text-align:center;color:#999;">Kategori "${providerKey}" belum tersedia di product.json.</p>`;
        }
        return;
      }

      // Simpan konfigurasi global & provider ke window agar bisa dipakai modal checkout/WA
      window.COCENTER_CATALOG = {
        providerKey,
        waAdmin: catalog.wa_admin || "6288971071456",
        promoGlobal: catalog.promo_global || [],
        voucherKhusus: providerData.voucher_khusus || [],
        allPromos: [
          ...(catalog.promo_global || []),
          ...(providerData.voucher_khusus || [])
        ],
        adminFee: providerData.admin_fee || 0,
        provider: providerData
      };

      // Update judul halaman & input tujuan otomatis jika elemennya ada
      const titleEl = document.getElementById("judulLayanan");
      if (titleEl && providerData.judul_item) {
        titleEl.textContent = providerData.judul_item;
      }

      const labelTujuanEl = document.getElementById("labelTujuan");
      if (labelTujuanEl && providerData.label_tujuan) {
        labelTujuanEl.textContent = providerData.label_tujuan;
      }

      const inputTujuanEl = document.getElementById("inputTujuan");
      if (inputTujuanEl && providerData.placeholder_tujuan) {
        inputTujuanEl.placeholder = providerData.placeholder_tujuan;
      }

      // Render daftar paket ke #paketContainer
      if (container && Array.isArray(providerData.paket)) {
        renderPaketCards(container, providerData.paket);
      }

      // Kirim event agar script checkout / QRIS / WA di halaman tahu data sudah siap
      window.dispatchEvent(
        new CustomEvent("cocenter:catalog-ready", {
          detail: window.COCENTER_CATALOG
        })
      );
    } catch (err) {
      console.error("Gagal memuat product.json:", err);
      if (container) {
        container.innerHTML = `<p style="text-align:center;color:#ff6b6b;">Gagal memuat daftar paket. Coba refresh halaman.</p>`;
      }
    }
  }

  function renderPaketCards(container, paketList) {
    container.innerHTML = paketList
      .map((item) => {
        const isReady = item.stok !== false;
        const hargaFormatted = Number(item.harga || 0).toLocaleString("id-ID");
        const badgeHtml = item.badge
          ? `<span class="paket-badge">${item.badge}</span>`
          : "";
        const stokHtml = !isReady
          ? `<span class="paket-habis">Stok Habis</span>`
          : "";

        return `
          <div class="paket-card ${isReady ? "" : "disabled"}"
               data-id="${item.id || ""}"
               data-nama="${escapeAttr(item.nama)}"
               data-detail="${escapeAttr(item.detail || "")}"
               data-harga="${Number(item.harga || 0)}"
               data-stok="${isReady}"
               onclick="${isReady ? `pilihPaket(${Number(item.harga || 0)}, '${escapeJs(item.nama)}', '${escapeJs(item.detail || "")}', '${escapeJs(item.id || "")}')` : ""}">
            <div class="paket-top">
              <div class="paket-nama">${item.nama}</div>
              ${badgeHtml}
            </div>
            <div class="paket-detail">${item.detail || ""}</div>
            <div class="paket-bottom">
              <div class="paket-harga">Rp ${hargaFormatted}</div>
              ${stokHtml}
            </div>
          </div>
        `;
      })
      .join("");
  }

  function escapeAttr(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeJs(str) {
    return String(str || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  }

  document.addEventListener("DOMContentLoaded", loadCatalog);
})();
