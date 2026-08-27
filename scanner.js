// scanner.js — kamera orqali shtrix-kod skanerlash (html5-qrcode kutubxonasi asosida)

let _html5QrCode = null;
let _scannerActiveInputId = null;
let _scannerAutoSubmitFormId = null;
let _scannerStarting = false;

function openBarcodeScanner(inputId, autoSubmitFormId) {
  if (_scannerStarting) return;
  if (typeof Html5Qrcode === "undefined") {
    showToast("Skaner kutubxonasi yuklanmadi. Internet aloqasini tekshiring.", "error");
    return;
  }

  _scannerActiveInputId = inputId;
  _scannerAutoSubmitFormId = autoSubmitFormId || null;
  _scannerStarting = true;

  const modal = document.getElementById("barcode-scanner-modal");
  const hint = document.getElementById("scanner-hint");
  modal.classList.remove("hidden");
  hint.textContent = "Kamera ochilmoqda...";

  _html5QrCode = new Html5Qrcode("scanner-viewport");
  const config = {
    fps: 10,
    qrbox: (viewfinderWidth, viewfinderHeight) => {
      const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.75);
      return { width: size, height: Math.floor(size * 0.5) };
    },
  };

  Html5Qrcode.getCameras()
    .then((cameras) => {
      if (!cameras || cameras.length === 0) {
        showToast("Kamera topilmadi", "error");
        closeBarcodeScanner();
        return;
      }
      const backCam =
        cameras.find((c) => /back|rear|environment/i.test(c.label)) ||
        cameras[cameras.length - 1];

      return _html5QrCode.start(
        backCam.id,
        config,
        (decodedText) => onBarcodeDetected(decodedText),
        () => {
          /* har bir freymdagi topilmadi xatolarini e'tiborsiz qoldiramiz */
        }
      );
    })
    .then(() => {
      hint.textContent = "Kamerani shtrix-kodga qarating";
    })
    .catch((err) => {
      showToast("Kameraga ruxsat berilmadi yoki kamera topilmadi", "error");
      closeBarcodeScanner();
    })
    .finally(() => {
      _scannerStarting = false;
    });
}

function onBarcodeDetected(code) {
  const input = document.getElementById(_scannerActiveInputId);
  if (input) {
    input.value = code;
  }
  const formId = _scannerAutoSubmitFormId;
  closeBarcodeScanner();

  if (formId) {
    const form = document.getElementById(formId);
    if (form) {
      if (form.requestSubmit) form.requestSubmit();
      else form.dispatchEvent(new Event("submit", { cancelable: true }));
    }
  } else {
    showToast("Shtrix-kod o'qildi: " + code, "success");
  }
}

function closeBarcodeScanner() {
  const modal = document.getElementById("barcode-scanner-modal");
  modal.classList.add("hidden");
  document.getElementById("scanner-viewport").innerHTML = "";

  if (_html5QrCode) {
    const instance = _html5QrCode;
    _html5QrCode = null;
    instance
      .stop()
      .then(() => instance.clear())
      .catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("scanner-close-btn").addEventListener("click", closeBarcodeScanner);

  document.querySelectorAll("[data-scan-target]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openBarcodeScanner(btn.dataset.scanTarget, btn.dataset.scanAutosubmit || null);
    });
  });
});
