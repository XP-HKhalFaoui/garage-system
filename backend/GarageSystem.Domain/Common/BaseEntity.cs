namespace GarageSystem.Domain.Common;

public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime DateCreation { get; set; } = DateTime.UtcNow;
    public DateTime? DateModification { get; set; }
}

public interface ISoftDelete
{
    bool IsDeleted { get; set; }
    DateTime? DateSuppression { get; set; }
}

public abstract class SoftDeleteEntity : BaseEntity, ISoftDelete
{
    public bool IsDeleted { get; set; }
    public DateTime? DateSuppression { get; set; }
}
