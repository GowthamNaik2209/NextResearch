import { redirect } from "next/navigation";

// The ideas are listed on the Baskets page; /baskets/ideas (the parent of each idea's page) goes there.
export default function IdeasIndex() {
  redirect("/baskets#ideas");
}
