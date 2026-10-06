import { useEffect, useMemo, useState } from "react";
import ConfirmationModal from "../components/ConfirmationModal";
import api from "../services/api";
import "./ProviderCategories.css";

type Category = {
  id: number;
  name: string;
  description: string | null;
  provider_id: number | null;
};

type CategoryForm = {
  name: string;
  description: string;
};

const getApiErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  const requestError = error as {
    response?: {
      data?: {
        detail?: unknown;
      };
    };
    message?: string;
  };

  const detail = requestError.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item: any) => item?.msg || String(item))
      .join(", ");
  }

  return requestError.message || fallback;
};

function ProviderCategories() {
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<Category | null>(null);

  const [search, setSearch] = useState("");

  const [form, setForm] = useState<CategoryForm>({
    name: "",
    description: "",
  });

  /* =====================================================
     LOAD MY CATEGORIES
  ===================================================== */

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get<Category[]>(
        "/categories/my"
      );

      setCategories(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (error) {
      setError(
        getApiErrorMessage(
          error,
          "Unable to load categories."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  /* =====================================================
     SEARCH
  ===================================================== */

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return categories;
    }

    return categories.filter((category) => {
      return (
        category.name
          .toLowerCase()
          .includes(query) ||
        (category.description || "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [categories, search]);

  /* =====================================================
     RESET FORM
  ===================================================== */

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
    });

    setEditingId(null);
    setShowForm(false);
  };

  /* =====================================================
     ADD FORM
  ===================================================== */

  const openAddForm = () => {
    setEditingId(null);

    setForm({
      name: "",
      description: "",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  };

  /* =====================================================
     EDIT FORM
  ===================================================== */

  const openEditForm = (category: Category) => {
    setEditingId(category.id);

    setForm({
      name: category.name,
      description: category.description || "",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  };

  /* =====================================================
     FORM CHANGE
  ===================================================== */

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /* =====================================================
     CREATE / UPDATE CATEGORY
  ===================================================== */

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    try {
      setError("");
      setSuccess("");

      const categoryName = form.name.trim();

      if (!categoryName) {
        setError("Please enter category name.");
        return;
      }

      setSaving(true);

      const payload = {
        name: categoryName,
        description:
          form.description.trim() || null,
      };

      if (editingId !== null) {
        await api.put(
          `/categories/${editingId}`,
          payload
        );

        setSuccess(
          "Category updated successfully."
        );
      } else {
        await api.post(
          "/categories/",
          payload
        );

        setSuccess(
          "Category added successfully."
        );
      }

      resetForm();

      await loadCategories();
    } catch (error) {
      setError(
        getApiErrorMessage(
          error,
          "Unable to save category."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     DELETE CATEGORY
  ===================================================== */

  const deleteCategory = async (
    category: Category
  ) => {
    setConfirmDeleteCategory(category);
  };

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="provider-categories">
      <div className="categories-container">

        {/* ================= HEADER ================= */}

        <div className="categories-header">

          <div>
            <h1>My Categories</h1>

            <p>
              Organize the services offered by your shop.
            </p>
          </div>

          <button
            className="add-category-button"
            onClick={openAddForm}
          >
            + Add Category
          </button>

        </div>

        {/* ================= MESSAGES ================= */}

        {error && (
          <div className="category-message error">
            {error}
          </div>
        )}

        {success && (
          <div className="category-message success">
            {success}
          </div>
        )}

        {/* ================= FORM ================= */}

        {showForm && (
          <div className="category-form-card">

            <div className="category-form-header">

              <div>
                <h2>
                  {editingId !== null
                    ? "Edit Category"
                    : "Add New Category"}
                </h2>

                <p>
                  Create a category for your shop services.
                </p>
              </div>

              <button
                type="button"
                className="category-close-button"
                onClick={resetForm}
                disabled={saving}
              >
                Close
              </button>

            </div>

            <form onSubmit={handleSubmit}>

              <div className="category-form-grid">

                {/* CATEGORY NAME */}

                <div className="category-form-group">

                  <label>
                    Category Name
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Example: Hair & Beauty"
                    maxLength={100}
                    required
                  />

                </div>

                {/* DESCRIPTION */}

                <div className="category-form-group category-full-width">

                  <label>
                    Description
                  </label>

                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Describe this category..."
                    rows={4}
                    maxLength={255}
                  />

                </div>

              </div>

              {/* FORM BUTTONS */}

              <div className="category-form-actions">

                <button
                  type="button"
                  className="category-secondary-button"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="category-save-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId !== null
                    ? "Update Category"
                    : "Save Category"}
                </button>

              </div>

            </form>
          </div>
        )}

        {/* ================= CATEGORIES SECTION ================= */}

        <div className="categories-section">

          <div className="categories-section-header">

            <div>
              <h2>Categories</h2>

              <p>
                {categories.length}{" "}
                {categories.length === 1
                  ? "category"
                  : "categories"}
              </p>
            </div>

            {categories.length > 0 && (
              <div className="category-search">

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search categories..."
                />

              </div>
            )}

          </div>

          {/* ================= LOADING ================= */}

          {loading ? (
            <div className="categories-empty">

              <div className="category-loading">
                Loading categories...
              </div>

            </div>
          ) : categories.length === 0 ? (

            /* ================= NO CATEGORIES ================= */

            <div className="categories-empty">

              <h3>
                No categories found
              </h3>

              <p>
                Add your first category to organize
                your services.
              </p>

              <button
                className="empty-add-category-button"
                onClick={openAddForm}
              >
                + Add Your First Category
              </button>

            </div>

          ) : filteredCategories.length === 0 ? (

            /* ================= NO SEARCH RESULT ================= */

            <div className="categories-empty">

              <h3>
                No matching categories
              </h3>

              <p>
                Try searching with a different name.
              </p>

            </div>

          ) : (

            /* ================= CATEGORY CARDS ================= */

            <div className="categories-grid">

              {filteredCategories.map(
                (category) => (

                  <div
                    className="category-card"
                    key={category.id}
                  >

                    <div className="category-card-top">

                      <div className="category-number">
                        {category.id}
                      </div>

                      <div className="category-card-title">

                        <h3>
                          {category.name}
                        </h3>

                        <span>
                          Category #{category.id}
                        </span>

                      </div>

                    </div>

                    <p className="category-description">
                      {category.description ||
                        "No description provided."}
                    </p>

                    <div className="category-card-footer">

                      <button
                        className="category-edit-button"
                        onClick={() =>
                          openEditForm(category)
                        }
                        disabled={
                          deletingId === category.id
                        }
                      >
                        Edit
                      </button>

                      <button
                        className="category-delete-button"
                        onClick={() =>
                          deleteCategory(category)
                        }
                        disabled={
                          deletingId === category.id
                        }
                      >
                        {deletingId === category.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>

      </div>

      <ConfirmationModal
        open={confirmDeleteCategory !== null}
        title="Delete category?"
        message={
          confirmDeleteCategory
            ? `Are you sure you want to delete "${confirmDeleteCategory.name}"?`
            : "Are you sure you want to delete this category?"
        }
        confirmLabel="Delete category"
        loading={deletingId !== null}
        onConfirm={async () => {
          if (!confirmDeleteCategory) {
            return;
          }

          try {
            setError("");
            setSuccess("");
            setDeletingId(confirmDeleteCategory.id);
            await api.delete(
              `/categories/${confirmDeleteCategory.id}`
            );
            setSuccess("Category deleted successfully.");
            setConfirmDeleteCategory(null);
            await loadCategories();
          } catch (error) {
            setError(
              getApiErrorMessage(
                error,
                "Unable to delete category."
              )
            );
          } finally {
            setDeletingId(null);
          }
        }}
        onCancel={() => setConfirmDeleteCategory(null)}
      />
    </div>
  );
}

export default ProviderCategories;