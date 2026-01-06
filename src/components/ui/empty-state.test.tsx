import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Search, FolderOpen } from "lucide-react";
import {
  EmptyState,
  NoTasksFound,
  NoSearchResults,
  NoDataAvailable,
  ErrorState,
} from "./empty-state";

describe("EmptyState", () => {
  it("renders title correctly", () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText("No items found")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <EmptyState
        title="Empty"
        description="There are no items to display"
      />
    );
    expect(screen.getByText("There are no items to display")).toBeInTheDocument();
  });

  it("renders action button and handles click", () => {
    const handleClick = vi.fn();
    render(
      <EmptyState
        title="Empty"
        action={{ label: "Add Item", onClick: handleClick }}
      />
    );
    
    const button = screen.getByRole("button", { name: "Add Item" });
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders secondary action when provided", () => {
    const handlePrimary = vi.fn();
    const handleSecondary = vi.fn();
    
    render(
      <EmptyState
        title="Empty"
        action={{ label: "Primary", onClick: handlePrimary }}
        secondaryAction={{ label: "Secondary", onClick: handleSecondary }}
      />
    );
    
    expect(screen.getByRole("button", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Secondary" })).toBeInTheDocument();
  });

  it("renders children when provided", () => {
    render(
      <EmptyState title="Empty">
        <span data-testid="custom-child">Custom content</span>
      </EmptyState>
    );
    expect(screen.getByTestId("custom-child")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <EmptyState title="Empty" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("applies different size classes", () => {
    const { rerender, container } = render(
      <EmptyState title="Empty" size="sm" />
    );
    expect(container.firstChild).toHaveClass("py-6");
    
    rerender(<EmptyState title="Empty" size="lg" />);
    expect(container.firstChild).toHaveClass("py-16");
  });
});

describe("NoTasksFound", () => {
  it("renders default content", () => {
    render(<NoTasksFound />);
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
  });

  it("shows create button when onCreateTask provided", () => {
    const handleCreate = vi.fn();
    render(<NoTasksFound onCreateTask={handleCreate} />);
    
    const button = screen.getByRole("button", { name: "Create Task" });
    fireEvent.click(button);
    expect(handleCreate).toHaveBeenCalled();
  });

  it("hides create button when onCreateTask not provided", () => {
    render(<NoTasksFound />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("NoSearchResults", () => {
  it("renders with query", () => {
    render(<NoSearchResults query="test search" />);
    expect(screen.getByText(/No results found for "test search"/)).toBeInTheDocument();
  });

  it("renders without query", () => {
    render(<NoSearchResults />);
    expect(screen.getByText("No results match your current filters.")).toBeInTheDocument();
  });

  it("shows clear button when onClear provided", () => {
    const handleClear = vi.fn();
    render(<NoSearchResults onClear={handleClear} />);
    
    const button = screen.getByRole("button", { name: "Clear Search" });
    fireEvent.click(button);
    expect(handleClear).toHaveBeenCalled();
  });
});

describe("NoDataAvailable", () => {
  it("renders with default message", () => {
    render(<NoDataAvailable />);
    expect(screen.getByText("There's no data to display at the moment.")).toBeInTheDocument();
  });

  it("renders with custom message", () => {
    render(<NoDataAvailable message="Custom empty message" />);
    expect(screen.getByText("Custom empty message")).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("renders with default title and message", () => {
    render(<ErrorState />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("An error occurred while loading the data. Please try again.")).toBeInTheDocument();
  });

  it("renders with custom title and message", () => {
    render(<ErrorState title="Custom Error" message="Custom error message" />);
    expect(screen.getByText("Custom Error")).toBeInTheDocument();
    expect(screen.getByText("Custom error message")).toBeInTheDocument();
  });

  it("shows retry button when onRetry provided", () => {
    const handleRetry = vi.fn();
    render(<ErrorState onRetry={handleRetry} />);
    
    const button = screen.getByRole("button", { name: "Try Again" });
    fireEvent.click(button);
    expect(handleRetry).toHaveBeenCalled();
  });
});
