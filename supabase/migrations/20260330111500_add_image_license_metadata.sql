alter table public."Constellation"
  add column if not exists "brightestStarImageLicenseName" text,
  add column if not exists "brightestStarImageLicenseUrl" text,
  add column if not exists "brightestStarImageAttribution" text,
  add column if not exists "brightestStarImageSourceUrl" text;

alter table public."FeaturedStar"
  add column if not exists "imageLicenseName" text,
  add column if not exists "imageLicenseUrl" text,
  add column if not exists "imageAttribution" text,
  add column if not exists "imageSourceUrl" text;
