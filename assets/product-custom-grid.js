document.addEventListener("DOMContentLoaded", () => {
  const state = {
    selectedVariants: {},
  };

  /* -----------------------------
     Utilities
  ----------------------------- */

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) =>
    Array.from(scope.querySelectorAll(selector));

  const getProductEl = (productId) =>
    $(`[product-data-id="${productId}"]`);

  const getVariants = (productId) =>
    JSON.parse(getProductEl(productId)?.dataset.variants || "[]");

  const getSelectedOptions = (productId) =>
    state.selectedVariants[productId] || {};

  const setSelectedOption = (productId, key, value) => {
    state.selectedVariants[productId] ??= {};
    state.selectedVariants[productId][key] = value;
  };

  /* -----------------------------
     Dropdowns
  ----------------------------- */

  function initDropdowns() {
    $$(".custom-dropdown").forEach((dropdown) => {
      const { productId } = dropdown.dataset;
      const selected = $(".selected-option", dropdown);

      selected.addEventListener("click", (e) => {
        e.stopPropagation();
        closeAllDropdowns();
        dropdown.classList.toggle("active");
      });

      $$(".option", dropdown).forEach((option) => {
        option.addEventListener("click", (e) => {
          e.stopPropagation();
          selected.textContent = option.dataset.value;
          selected.classList.add("selected");
          dropdown.classList.remove("active");

          setSelectedOption(
            productId,
            option.dataset.option,
            option.dataset.value
          );

          clearError(productId);
          updatePrice(productId);
        });
      });
    });

    document.addEventListener("click", closeAllDropdowns);
  }

  const closeAllDropdowns = () =>
    $$(".custom-dropdown").forEach((d) => d.classList.remove("active"));

  /* -----------------------------
     Color Swatches
  ----------------------------- */

  function initColorSwatches() {
    $$(".color-swatch").forEach((swatch) => {
      swatch.addEventListener("click", (e) => {
        e.stopPropagation();
        const wrapper = swatch.closest(".color-swatches");
        const { productId } = wrapper.dataset;

        $$(".color-swatch", wrapper).forEach((s) =>
          s.classList.remove("color-active")
        );
        swatch.classList.add("color-active");

        setSelectedOption(
          productId,
          swatch.dataset.option,
          swatch.dataset.value
        );

        clearError(productId);
        updatePrice(productId);
      });
    });
  }

  /* -----------------------------
     Add To Cart
  ----------------------------- */

  function initAddToCart() {
    $$(".add-to-cart-btn").forEach((btn) =>
      btn.addEventListener("click", () =>
        handleAddToCart(btn.dataset.productId)
      )
    );
  }

  async function handleAddToCart(productId) {
    const button = $(
      `.add-to-cart-btn[data-product-id="${productId}"]`
    );
    const options = getSelectedOptions(productId);

    if (!options.Color) return showError(productId, "Please select a color");
    if (!options.Size) return showError(productId, "Please select a size");

    const variant = findVariant(productId, options);

    if (!variant)
      return showError(productId, "Selected combination not available");
    if (!variant.available)
      return showError(productId, "Variant out of stock");

    const items = buildCartItems(variant, options);

    toggleButton(button, true);

    try {
      await addItemsToCart(items);
      closeProductPopup();
      updateCartCount();
      alert(
        `Product added to cart${
          items.length > 1 ? " with bonus item" : ""
        }!`
      );
    } catch (err) {
      showError(productId, err.message || "Add to cart failed");
    } finally {
      toggleButton(button, false);
    }
  }

  /* -----------------------------
     Variant & Cart Helpers
  ----------------------------- */

  const findVariant = (productId, options) =>
    getVariants(productId).find(
      (v) =>
        [v.option1, v.option2].includes(options.Color) &&
        [v.option1, v.option2].includes(options.Size)
    );

  const buildCartItems = (variant, options) => {
    const items = [{ id: variant.id, quantity: 1 }];

    const isBlackM =
      options.Color.toLowerCase() === "black" &&
      options.Size.toUpperCase() === "M";

    if (isBlackM) {
      items.push({ id: 42121310928980, quantity: 1 });
    }

    return items;
  };

  const addItemsToCart = async (items) => {
    for (const item of items) {
      const res = await fetch("/cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const data = await res.json();
      if (data.status === 422) throw new Error(data.description);
    }
  };

  const toggleButton = (btn, loading) => {
    btn.disabled = loading;
    btn.textContent = loading ? "Adding..." : "Add to Cart";
  };

  /* -----------------------------
     UI Updates
  ----------------------------- */

  function updatePrice(productId) {
    const options = getSelectedOptions(productId);
    if (!options.Color || !options.Size) return;

    const variant = findVariant(productId, options);
    const priceEl = $(`#variantPrice-${productId}`);

    if (variant && priceEl) {
      priceEl.textContent = (variant.price / 100).toFixed(2);
    }
  }

  function updateCartCount() {
    fetch("/cart.js")
      .then((r) => r.json())
      .then((cart) =>
        $$(".cart-count").forEach(
          (el) => (el.textContent = cart.item_count)
        )
      );
  }

  function showError(productId, msg) {
    const el = $(`#error-${productId}`);
    el.textContent = msg;
    el.style.display = "block";
  }

  function clearError(productId) {
    const el = $(`#error-${productId}`);
    el.style.display = "none";
  }

  /* -----------------------------
     Popup Controls
  ----------------------------- */

  window.openProductPopup = (productId) => {
    const popup = $(`#productPopup-${productId}`);
    if (!popup) return;

    popup.classList.add("active");
    document.body.style.overflow = "hidden";
    resetSelections(productId);
  };

  window.closeProductPopup = () => {
    $(".popup-overlay.active")?.classList.remove("active");
    document.body.style.overflow = "";
    closeAllDropdowns();
  };

  function resetSelections(productId) {
    delete state.selectedVariants[productId];
    clearError(productId);

    $(
      `.custom-dropdown[data-product-id="${productId}"] .selected-option`
    )?.classList.remove("selected");

    $(
      `.custom-dropdown[data-product-id="${productId}"] .selected-option`
    ).textContent = "Select your size";

    $(
      `.color-swatches[data-product-id="${productId}"]`
    )?.querySelectorAll(".color-swatch")
      .forEach((s) => s.classList.remove("color-active"));
  }

  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("popup-overlay")) {
      window.closeProductPopup();
    }
  });

  /* -----------------------------
     Init
  ----------------------------- */

  initDropdowns();
  initColorSwatches();
  initAddToCart();
});